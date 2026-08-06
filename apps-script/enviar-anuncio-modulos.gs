// Campaña separada del envío de tokens (enviar-tokens.gs). Nombres de función
// distintos a propósito: si ambos .gs terminan en el mismo proyecto de Apps
// Script, una función duplicada rompe el proyecto entero.
function enviarPruebaAnuncio() {
  enviarAnuncios(["3202"]);
}

function enviarTodosAnuncio() {
  enviarAnuncios(null);
}

function programarEnvioAnuncio() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "enviarTodosAnuncio") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("enviarTodosAnuncio")
    .timeBased()
    .at(new Date("2026-08-07T14:00:00Z"))
    .create();
  Logger.log("Programado.");
}

function enviarAnuncios(unidadesPrueba) {
  var ss    = SpreadsheetApp.openById("1JlRcWXd2Jct7K94OH5C6BVJY86dd_E5YxGmraNJAbEU");
  var sheet = ss.getSheets()[0];
  var data  = sheet.getDataRange().getValues();

  var porCorreo = {};
  for (var i = 1; i < data.length; i++) {
    var unidad = String(data[i][1] || "").trim();
    var nombre = String(data[i][2] || "").trim();
    var correo = String(data[i][3] || "").trim();
    var token  = String(data[i][6] || "").trim();
    // A diferencia del envío de tokens para la asamblea, aquí NO se filtra
    // por "habilitado": ese campo solo restringe el módulo de Votaciones,
    // pero el registro de datos (Propietarios/Residentes/Vehículos/Bicicletas)
    // aplica para todos los que tengan correo y token asignado.
    if (!correo || !token) continue;
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

    var asunto = "Seguimos evolucionando como copropiedad - Ingresa y regístrate";

    var h = "";
    h += "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;'>";
    h += "<div style='background:#1B5E20;padding:28px 32px;text-align:center;'>";
    h += "<p style='color:rgba(255,255,255,0.7);font-size:11px;margin:0 0 8px;'>Agrupacion El Portal - Tocancipa</p>";
    h += "<h1 style='color:#fff;font-size:20px;margin:0;'>Seguimos evolucionando como copropiedad</h1>";
    h += "</div>";
    h += "<div style='padding:32px;'>";
    h += "<p style='font-size:15px;color:#111;'>Estimado(a) <strong>" + p.nombre + "</strong>,</p>";
    h += "<p style='font-size:14px;color:#333;line-height:1.7;'>Como propietario(a) de <strong>" + aptos + "</strong>, te contamos que a partir de ahora nuestro sistema digital tambien llevara las bases de datos de la copropiedad.</p>";
    h += "<p style='font-size:14px;color:#333;line-height:1.7;'>Por eso te invitamos a ingresar e inscribir la informacion de estos modulos:</p>";

    h += "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:20px 0;border-collapse:separate;border-spacing:8px;'>";
    h += "<tr>";
    h += "<td width='50%' style='background:#f1f8e9;border-left:4px solid #1B5E20;border-radius:6px;padding:12px 14px;'><p style='margin:0;font-size:13px;font-weight:700;color:#1B5E20;'>Propietarios</p></td>";
    h += "<td width='50%' style='background:#f1f8e9;border-left:4px solid #1B5E20;border-radius:6px;padding:12px 14px;'><p style='margin:0;font-size:13px;font-weight:700;color:#1B5E20;'>Residentes</p></td>";
    h += "</tr><tr>";
    h += "<td width='50%' style='background:#fff3e0;border-left:4px solid #E65100;border-radius:6px;padding:12px 14px;'><p style='margin:0;font-size:13px;font-weight:700;color:#E65100;'>Vehiculos</p></td>";
    h += "<td width='50%' style='background:#fff3e0;border-left:4px solid #E65100;border-radius:6px;padding:12px 14px;'><p style='margin:0;font-size:13px;font-weight:700;color:#E65100;'>Bicicletas</p></td>";
    h += "</tr>";
    h += "</table>";

    h += "<p style='font-size:14px;color:#333;line-height:1.7;'>Esta informacion es fundamental para el funcionamiento adecuado de la copropiedad.</p>";

    h += "<p style='font-size:14px;color:#333;'>Ingresas con tu correo y el mismo token que usaste en la asamblea:</p>";
    h += "<div style='background:#fff8f0;border:2px solid #E65100;border-radius:10px;padding:20px;text-align:center;margin:24px 0;'>";
    h += "<p style='font-size:12px;color:#E65100;font-weight:700;margin:0 0 8px;'>TU TOKEN DE ACCESO</p>";
    h += "<p style='font-size:36px;font-weight:900;color:#E65100;letter-spacing:4px;margin:0;'>" + p.token + "</p>";
    h += "<p style='font-size:12px;color:#996633;margin:10px 0 0;'>El token es el mismo que fue enviado para las votaciones de la asamblea.</p>";
    h += "</div>";

    h += "<div style='background:#fff3e0;border-left:4px solid #E65100;padding:14px 18px;margin-bottom:24px;'>";
    h += "<p style='font-size:13px;color:#333;margin:0;'>Este token es personal y privado, solo lo debes conocer tu. Si necesitas cambiarlo, escribe a la administracion.</p>";
    h += "</div>";

    h += "<p style='font-size:14px;color:#1B5E20;font-weight:700;text-align:center;line-height:1.6;'>Ayudanos a tener la informacion actualizada, la autogestion nos ayuda a crecer como copropiedad.</p>";

    h += "<div style='text-align:center;margin:24px 0;'>";
    h += "<a href='https://votacion-portal.vercel.app' style='background:#1B5E20;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;'>Ingresar y registrarme</a>";
    h += "</div>";
    h += "</div>";
    h += "<div style='background:#f5f5f5;padding:16px 32px;text-align:center;border-top:1px solid #eee;'>";
    h += "<p style='font-size:11px;color:#999;margin:0;'>Agrupacion El Portal de Tocancipa - Sistema digital 2026</p>";
    h += "</div>";
    h += "</div>";

    try {
      GmailApp.sendEmail(p.correo, asunto, "Ingresa con tu correo y tu token (" + p.token + ") en https://votacion-portal.vercel.app para inscribir Propietarios, Residentes, Vehiculos y Bicicletas.", { htmlBody: h });
      Logger.log("OK - " + p.correo + " | " + p.unidades.join(", "));
      enviados++;
      Utilities.sleep(500);
    } catch(e) {
      Logger.log("ERROR - " + p.correo + ": " + e.message);
      omitidos++;
    }
  }

  Logger.log("Enviados: " + enviados + " | Errores: " + omitidos);
}
