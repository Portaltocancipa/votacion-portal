// Igual que enviar-tokens.gs (token de acceso por correo), pero además
// lee Supabase y le muestra a cada persona qué información ya tiene
// completa en el sistema (Propietario, Residente, Parqueadero, Mascotas,
// Bicicletas) y qué le falta por diligenciar.
//
// Antes de correr: en el editor de Apps Script -> Configuración del
// proyecto -> Propiedades del script, agrega:
//   SUPABASE_URL              = https://sgxphcgjmqifrqqmshwb.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = (la misma que SUPABASE_SERVICE_ROLE_KEY
//                                 en el .env.local del proyecto)
// Nunca pegues la service role key directo en este archivo: con eso
// cualquiera que vea el código se salta la Row Level Security de las
// tablas de Supabase.

function enviarPruebaConChecklist() {
  // Prueba con el Consejo: unidades 1402, 8502 y 3202.
  enviarEmailsConChecklist(["1402", "8502", "3202"]);
}

function enviarTodosConChecklist() {
  enviarEmailsConChecklist(null);
}

function programarEnvioMasivoConChecklist() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "enviarTodosConChecklist") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("enviarTodosConChecklist")
    .timeBased()
    .at(new Date("2026-07-23T19:00:00Z"))
    .create();
  Logger.log("Programado: 23 julio 2:00 PM Colombia.");
}

// ── Estado en Supabase (residentes/propietarios/parqueaderos/mascotas/
// bicicletas) ───────────────────────────────────────────────────────────
//
// Una sola consulta por tabla (no una por persona) para no gastar cuota
// de UrlFetchApp: se trae toda la tabla y se arma un mapa local
// correo -> filas, más un segundo mapa unidad -> precargados (residentes/
// propietarios distinguen "completo", diligenciado por la persona, de
// "precargado", el dato que ya teníamos de Nova/propietarios oficiales;
// ver supabase_registros.sql y la migración
// 20261015000000_precarga_residentes_propietarios.sql -- las demás tablas
// no tienen ese concepto, nunca se precargaron).
//
// Cada módulo tiene su propio set de columnas relevantes:
//   Propietario / Residente -> nombre, documento, teléfono, correo
//   Parqueadero             -> dueño, marca, placa
//   Mascotas                -> mascota, especie
//   Bicicletas              -> resumen simple (cuántas)
var CAMPOS_POR_TABLA = {
  propietarios: "correo,unidad,nombres,apellidos,telefono,numero_documento,precargado",
  residentes: "correo,unidad,nombres,apellidos,telefono,numero_documento,precargado",
  parqueaderos: "correo,unidad,nombres,apellidos,marca,placa",
  mascotas: "correo,unidad,nombre,especie",
  bicicletas: "correo,unidad",
};
var TABLAS_CON_PRECARGADO = ["propietarios", "residentes"];
var TABLAS_ESTADO = Object.keys(CAMPOS_POR_TABLA);

function cargarEstado_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("SUPABASE_URL");
  var key = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las propiedades del script.");

  var porCorreo = {};
  var porUnidadPrecargado = {};

  TABLAS_ESTADO.forEach(function(tabla) {
    var endpoint = url + "/rest/v1/" + tabla + "?select=" + CAMPOS_POR_TABLA[tabla] + "&eliminado=eq.false";
    var resp = UrlFetchApp.fetch(endpoint, {
      headers: { apikey: key, Authorization: "Bearer " + key },
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() !== 200) {
      Logger.log("Aviso: no se pudo leer " + tabla + " (" + resp.getResponseCode() + "): " + resp.getContentText());
      return;
    }
    var filas = JSON.parse(resp.getContentText());
    filas.forEach(function(f) {
      var correo = String(f.correo || "").toLowerCase();
      var registro = {
        unidad: f.unidad,
        precargado: !!f.precargado, // solo existe en propietarios/residentes
        nombres: f.nombres || "",
        apellidos: f.apellidos || "",
        telefono: f.telefono || "",
        numero_documento: f.numero_documento || "",
        marca: f.marca || "",
        placa: f.placa || "",
        nombreMascota: f.nombre || "",
        especie: f.especie || "",
        correo: f.correo || "",
      };

      if (correo) {
        if (!porCorreo[correo]) porCorreo[correo] = {};
        if (!porCorreo[correo][tabla]) porCorreo[correo][tabla] = [];
        porCorreo[correo][tabla].push(registro);
      }
      if (TABLAS_CON_PRECARGADO.indexOf(tabla) !== -1 && f.precargado && f.unidad) {
        if (!porUnidadPrecargado[f.unidad]) porUnidadPrecargado[f.unidad] = {};
        if (!porUnidadPrecargado[f.unidad][tabla]) porUnidadPrecargado[f.unidad][tabla] = [];
        porUnidadPrecargado[f.unidad][tabla].push(registro);
      }
    });
  });

  return { porCorreo: porCorreo, porUnidadPrecargado: porUnidadPrecargado };
}

var ETIQUETA_TABLA = {
  propietarios: "Propietario",
  residentes: "Residente",
  parqueaderos: "Parqueadero",
  mascotas: "Mascotas",
  bicicletas: "Bicicletas",
};

// Junta lo que la persona tiene con su correo + los precargados de sus
// unidades (deduplicados). Para parqueaderos/mascotas/bicicletas (sin
// concepto de precargado) esto es simplemente lo que tiene por correo.
function registrosDeModulo_(tabla, correo, unidadesPersona, estado) {
  var deCorreo = (estado.porCorreo[correo] && estado.porCorreo[correo][tabla]) || [];
  var registros = deCorreo.slice();
  if (TABLAS_CON_PRECARGADO.indexOf(tabla) !== -1) {
    unidadesPersona.forEach(function(u) {
      var precargadosUnidad = (estado.porUnidadPrecargado[u] && estado.porUnidadPrecargado[u][tabla]) || [];
      registros = registros.concat(precargadosUnidad);
    });
  }
  var vistos = {};
  return registros.filter(function(r) {
    var k = r.unidad + "|" + r.nombres + "|" + r.apellidos + "|" + r.placa + "|" + r.nombreMascota + "|" + r.precargado;
    if (vistos[k]) return false;
    vistos[k] = true;
    return true;
  });
}

function filaVacia_(colspan, etiqueta) {
  return "<tr>" +
    "<td style='padding:6px 8px;font-size:12px;color:#111;font-weight:600;'>" + etiqueta + "</td>" +
    "<td colspan='" + colspan + "' style='padding:6px 8px;font-size:12px;color:#999;'>—</td>" +
    "<td style='padding:6px 8px;font-size:12px;color:#999;font-weight:600;'>Sin registrar</td>" +
    "</tr>";
}

function tablaHtml_(encabezados, filasHtml) {
  var ths = encabezados.map(function(h) { return "<th style='padding:6px 8px;text-align:left;'>" + h + "</th>"; }).join("");
  return "<table style='width:100%;border-collapse:collapse;margin:10px 0 20px;font-size:12px;'>" +
    "<tr style='background:#f5f5f5;'>" + ths + "</tr>" +
    filasHtml.join("") +
    "</table>";
}

// Propietario / Residente: Módulo, Nombre, Documento, Teléfono, Correo, Estado
function construirTablaPersonas_(correo, unidadesPersona, estado) {
  var filas = [];
  ["propietarios", "residentes"].forEach(function(tabla) {
    var registros = registrosDeModulo_(tabla, correo, unidadesPersona, estado);
    if (registros.length === 0) { filas.push(filaVacia_(4, ETIQUETA_TABLA[tabla])); return; }
    registros.forEach(function(r) {
      var nombreCompleto = (r.nombres + " " + r.apellidos).trim() || "—";
      var estadoTxt = r.precargado ? "⚠️ Falta completar" : "✅ Completo";
      var estadoColor = r.precargado ? "#E65100" : "#1B5E20";
      filas.push(
        "<tr>" +
        "<td style='padding:6px 8px;font-size:12px;color:#111;font-weight:600;'>" + ETIQUETA_TABLA[tabla] + (r.unidad ? " (" + r.unidad + ")" : "") + "</td>" +
        "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + nombreCompleto + "</td>" +
        "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.numero_documento || "—") + "</td>" +
        "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.telefono || "—") + "</td>" +
        "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.correo || "—") + "</td>" +
        "<td style='padding:6px 8px;font-size:12px;color:" + estadoColor + ";font-weight:600;'>" + estadoTxt + "</td>" +
        "</tr>"
      );
    });
  });
  return tablaHtml_(["Módulo", "Nombre", "Documento", "Teléfono", "Correo", "Estado"], filas);
}

// Parqueadero: Unidad, Dueño, Marca, Placa, Estado
function construirTablaParqueaderos_(correo, unidadesPersona, estado) {
  var registros = registrosDeModulo_("parqueaderos", correo, unidadesPersona, estado);
  if (registros.length === 0) return tablaHtml_(["Unidad", "Dueño", "Marca", "Placa", "Estado"], [filaVacia_(3, "Parqueadero")]);
  var filas = registros.map(function(r) {
    var nombreCompleto = (r.nombres + " " + r.apellidos).trim() || "—";
    return "<tr>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.unidad || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + nombreCompleto + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.marca || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.placa || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#1B5E20;font-weight:600;'>✅ Completo</td>" +
      "</tr>";
  });
  return tablaHtml_(["Unidad", "Dueño", "Marca", "Placa", "Estado"], filas);
}

// Mascotas: Unidad, Mascota, Especie, Estado
function construirTablaMascotas_(correo, estado) {
  var registros = (estado.porCorreo[correo] && estado.porCorreo[correo].mascotas) || [];
  if (registros.length === 0) return tablaHtml_(["Unidad", "Mascota", "Especie", "Estado"], [filaVacia_(2, "Mascotas")]);
  var filas = registros.map(function(r) {
    return "<tr>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.unidad || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.nombreMascota || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#111;'>" + (r.especie || "—") + "</td>" +
      "<td style='padding:6px 8px;font-size:12px;color:#1B5E20;font-weight:600;'>✅ Completo</td>" +
      "</tr>";
  });
  return tablaHtml_(["Unidad", "Mascota", "Especie", "Estado"], filas);
}

// Bicicletas: resumen simple (no se pidió detalle para esta).
function construirResumenBicicletas_(correo, estado) {
  var registros = (estado.porCorreo[correo] && estado.porCorreo[correo].bicicletas) || [];
  var icono = registros.length > 0 ? "✅" : "—";
  var color = registros.length > 0 ? "#1B5E20" : "#999";
  var texto = registros.length > 0 ? registros.length + " registrada(s)" : "Sin registrar";
  return "<p style='font-size:13px;margin:0 0 20px;'>" +
    "<strong>Bicicletas:</strong> <span style='color:" + color + ";font-weight:600;'>" + icono + " " + texto + "</span>" +
    "</p>";
}

function enviarEmailsConChecklist(unidadesPrueba) {
  var ss    = SpreadsheetApp.openById("1JlRcWXd2Jct7K94OH5C6BVJY86dd_E5YxGmraNJAbEU");
  var sheet = ss.getSheets()[0];
  var data  = sheet.getDataRange().getValues();

  var estado = cargarEstado_();

  var porCorreo = {};
  for (var i = 1; i < data.length; i++) {
    var unidad     = String(data[i][1] || "").trim();
    var nombre     = String(data[i][2] || "").trim();
    var correo     = String(data[i][3] || "").trim();
    var habilitado = String(data[i][5] || "").trim().toLowerCase();
    var token      = String(data[i][6] || "").trim();
    if (!correo || !token) continue;
    if (habilitado === "no") continue;
    var k = correo.toLowerCase();
    if (!porCorreo[k]) {
      porCorreo[k] = { nombre: nombre, correo: correo, token: token, unidades: [] };
    }
    porCorreo[k].unidades.push(unidad);
  }

  var enviados = 0;
  var omitidos = 0;

  for (var key in porCorreo) {
    var p = porCorreo[key];

    if (unidadesPrueba) {
      var ok = false;
      for (var j = 0; j < unidadesPrueba.length; j++) {
        if (p.unidades.indexOf(unidadesPrueba[j]) !== -1) { ok = true; break; }
      }
      if (!ok) continue;
    }

    var aptos = p.unidades.length === 1
      ? "el apartamento " + p.unidades[0]
      : "los apartamentos " + p.unidades.join(", ");

    var asunto = "Token de acceso - Asamblea Agrupacion El Portal de Tocancipa";
    var tablaPersonasHtml = construirTablaPersonas_(key, p.unidades, estado);
    var tablaParqueaderosHtml = construirTablaParqueaderos_(key, p.unidades, estado);
    var tablaMascotasHtml = construirTablaMascotas_(key, estado);
    var resumenBicicletasHtml = construirResumenBicicletas_(key, estado);

    var h = "";
    h += "<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;'>";
    h += "<div style='background:#1B5E20;padding:28px 32px;text-align:center;'>";
    h += "<p style='color:rgba(255,255,255,0.7);font-size:11px;margin:0 0 8px;'>Agrupacion El Portal - Tocancipa</p>";
    h += "<h1 style='color:#fff;font-size:20px;margin:0;'>Sistema de Gestion El Portal</h1>";
    h += "</div>";
    h += "<div style='padding:32px;'>";
    h += "<p style='font-size:15px;color:#111;'>Estimado(a) <strong>" + p.nombre + "</strong>,</p>";
    h += "<p style='font-size:14px;color:#333;line-height:1.7;'>Usted esta registrado(a) frente a <strong>" + aptos + "</strong> en el sistema de la Agrupacion El Portal de Tocancipa (votaciones, residentes, propietarios, parqueaderos, mascotas y bicicletas).</p>";
    h += "<p style='font-size:14px;color:#333;'>Para ingresar al sistema se le ha asignado el siguiente token de acceso:</p>";
    h += "<div style='background:#fff8f0;border:2px solid #E65100;border-radius:10px;padding:20px;text-align:center;margin:24px 0;'>";
    h += "<p style='font-size:12px;color:#E65100;font-weight:700;margin:0 0 8px;'>SU TOKEN PERSONAL</p>";
    h += "<p style='font-size:36px;font-weight:900;color:#E65100;letter-spacing:4px;margin:0;'>" + p.token + "</p>";
    h += "</div>";
    h += "<div style='background:#fff3e0;border-left:4px solid #E65100;padding:14px 18px;margin-bottom:8px;'>";
    h += "<p style='font-size:13px;color:#333;margin:0;'>Este token unicamente lo conoce usted. Si tiene apoderado para el dia de la asamblea, debera compartirselo para que pueda votar en su nombre.</p>";
    h += "</div>";
    h += "<p style='font-size:14px;color:#333;margin:24px 0 0;'><strong>Asi esta su informacion hoy en el sistema:</strong></p>";
    h += tablaPersonasHtml;
    h += tablaParqueaderosHtml;
    h += tablaMascotasHtml;
    h += resumenBicicletasHtml;
    h += "<p style='font-size:13px;color:#666;'>Si ve algo en <span style='color:#E65100;font-weight:700;'>Falta completar</span> o <span style='color:#999;'>Sin registrar</span>, entre con su token y complete esa informacion.</p>";
    h += "<div style='text-align:center;margin:24px 0;'>";
    h += "<a href='https://gestion-elportaltocancipa.vercel.app' style='background:#1B5E20;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;'>Acceder y completar mi informacion</a>";
    h += "</div>";
    h += "</div>";
    h += "<div style='background:#f5f5f5;padding:16px 32px;text-align:center;border-top:1px solid #eee;'>";
    h += "<p style='font-size:11px;color:#999;margin:0;'>Agrupacion El Portal de Tocancipa - Sistema de Gestion</p>";
    h += "</div>";
    h += "</div>";

    try {
      GmailApp.sendEmail(p.correo, asunto, "Token: " + p.token, { htmlBody: h });
      Logger.log("OK - " + p.correo + " | " + p.unidades.join(", ") + " | " + p.token);
      enviados++;
      Utilities.sleep(500);
    } catch(e) {
      Logger.log("ERROR - " + p.correo + ": " + e.message);
      omitidos++;
    }
  }

  Logger.log("Enviados: " + enviados + " | Errores: " + omitidos);
}
