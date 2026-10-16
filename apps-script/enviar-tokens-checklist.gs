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
// bicicletas), por correo ──────────────────────────────────────────────
//
// Una sola consulta por tabla (no una por persona) para no gastar cuota
// de UrlFetchApp: se trae toda la tabla y se arma un mapa local
// correo -> filas. residentes/propietarios además distinguen "completo"
// (diligenciado por la persona) de "precargado" (solo el dato que ya
// teníamos de Nova/propietarios oficiales, ver supabase_registros.sql y
// la migración 20261015000000_precarga_residentes_propietarios.sql).
var TABLAS_ESTADO = ["propietarios", "residentes", "parqueaderos", "mascotas", "bicicletas"];

// Devuelve { porCorreo, porUnidadPrecargado }. porCorreo indexa por el
// correo guardado en cada fila (como antes). porUnidadPrecargado indexa
// además los precargados por unidad, sin importar su correo (muchos no
// tienen, ver nota arriba) -- así se puede cruzar contra las unidades que
// el Sheet de votantes autoriza para cada correo, igual que ya hace
// lib/registros.ts (listarPorCorreo) en la app.
function cargarEstado_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty("SUPABASE_URL");
  var key = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las propiedades del script.");

  var porCorreo = {};
  var porUnidadPrecargado = {};

  TABLAS_ESTADO.forEach(function(tabla) {
    var endpoint = url + "/rest/v1/" + tabla + "?select=correo,unidad,precargado&eliminado=eq.false";
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
      var registro = { unidad: f.unidad, precargado: !!f.precargado };

      if (correo) {
        if (!porCorreo[correo]) porCorreo[correo] = {};
        if (!porCorreo[correo][tabla]) porCorreo[correo][tabla] = [];
        porCorreo[correo][tabla].push(registro);
      }
      if (f.precargado && f.unidad) {
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

// Devuelve el bloque HTML del checklist para una persona: lo que tiene
// guardado con su correo, más los precargados de sus unidades (aunque
// esos precargados no tengan correo o tengan uno distinto -- es lo mismo
// que la persona ya ve en su cuenta dentro de la app).
function construirChecklistHtml_(correo, unidadesPersona, estado) {
  var deCorreo = estado.porCorreo[correo] || {};

  var filas = TABLAS_ESTADO.map(function(tabla) {
    var registros = (deCorreo[tabla] || []).slice();
    unidadesPersona.forEach(function(u) {
      var precargadosUnidad = (estado.porUnidadPrecargado[u] && estado.porUnidadPrecargado[u][tabla]) || [];
      registros = registros.concat(precargadosUnidad);
    });
    // Puede repetirse si el mismo precargado ya se trajo por correo y por
    // unidad; dedup simple por unidad+precargado, suficiente para el conteo.
    var vistos = {};
    registros = registros.filter(function(r) {
      var k = r.unidad + "|" + r.precargado;
      if (vistos[k]) return false;
      vistos[k] = true;
      return true;
    });

    var reales = registros.filter(function(r) { return !r.precargado; });
    var unidades = registros.map(function(r) { return r.unidad; }).filter(Boolean);
    var unidadesUnicas = unidades.filter(function(u, i) { return unidades.indexOf(u) === i; });

    var icono, texto, color;
    if (reales.length > 0) {
      icono = "✅"; color = "#1B5E20";
      texto = "Completo" + (unidadesUnicas.length ? " (" + unidadesUnicas.join(", ") + ")" : "");
    } else if (registros.length > 0) {
      icono = "⚠️"; color = "#E65100";
      texto = "Pendiente por completar" + (unidadesUnicas.length ? " (" + unidadesUnicas.join(", ") + ")" : "");
    } else {
      icono = "—"; color = "#999";
      texto = "Sin registrar";
    }

    return "<tr>" +
      "<td style='padding:6px 8px;font-size:13px;color:#111;'>" + icono + " " + ETIQUETA_TABLA[tabla] + "</td>" +
      "<td style='padding:6px 8px;font-size:13px;color:" + color + ";font-weight:600;'>" + texto + "</td>" +
      "</tr>";
  }).join("");

  return "<table style='width:100%;border-collapse:collapse;margin:20px 0;'>" + filas + "</table>";
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
    var checklistHtml = construirChecklistHtml_(key, p.unidades, estado);

    var h = "";
    h += "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;'>";
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
    h += checklistHtml;
    h += "<p style='font-size:13px;color:#666;'>Si ve algo en <span style='color:#E65100;font-weight:700;'>Pendiente por completar</span> o <span style='color:#999;'>Sin registrar</span>, entre con su token y complete esa informacion.</p>";
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
