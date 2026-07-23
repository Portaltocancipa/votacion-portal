function enviarPrueba() {
  enviarEmails(["3202", "8502", "8501", "7201"]);
}

function enviarTodos() {
  enviarEmails(null);
}

function programarEnvioMasivo() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "enviarTodos") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("enviarTodos")
    .timeBased()
    .at(new Date("2026-07-23T19:00:00Z"))
    .create();
  Logger.log("Programado: 23 julio 2:00 PM Colombia.");
}

function enviarEmails(unidadesPrueba) {
  var ss    = SpreadsheetApp.openById("1JlRcWXd2Jct7K94OH5C6BVJY86dd_E5YxGmraNJAbEU");
  var sheet = ss.getSheets()[0];
  var data  = sheet.getDataRange().getValues();

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

    var h = "";
    h += "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;'>";
    h += "<div style='background:#1B5E20;padding:28px 32px;text-align:center;'>";
    h += "<p style='color:rgba(255,255,255,0.7);font-size:11px;margin:0 0 8px;'>Agrupacion El Portal - Tocancipa</p>";
    h += "<h1 style='color:#fff;font-size:20px;margin:0;'>Sistema de Votacion Digital 2026</h1>";
    h += "</div>";
    h += "<div style='padding:32px;'>";
    h += "<p style='font-size:15px;color:#111;'>Estimado(a) <strong>" + p.nombre + "</strong>,</p>";
    h += "<p style='font-size:14px;color:#333;line-height:1.7;'>Usted como propietario(a) de <strong>" + aptos + "</strong> esta habilitado(a) para participar en las votaciones digitales de la <strong>Asamblea de Copropietarios</strong> de la Agrupacion El Portal de Tocancipa.</p>";
    h += "<p style='font-size:14px;color:#333;'>Para ingresar al sistema se le ha asignado el siguiente token de acceso:</p>";
    h += "<div style='background:#fff8f0;border:2px solid #E65100;border-radius:10px;padding:20px;text-align:center;margin:24px 0;'>";
    h += "<p style='font-size:12px;color:#E65100;font-weight:700;margin:0 0 8px;'>SU TOKEN PERSONAL</p>";
    h += "<p style='font-size:36px;font-weight:900;color:#E65100;letter-spacing:4px;margin:0;'>" + p.token + "</p>";
    h += "</div>";
    h += "<div style='background:#fff3e0;border-left:4px solid #E65100;padding:14px 18px;margin-bottom:24px;'>";
    h += "<p style='font-size:13px;color:#333;margin:0;'>Este token unicamente lo conoce usted. Si tiene apoderado para el dia de la asamblea, debera compartirselopara que pueda votar en su nombre.</p>";
    h += "</div>";
    h += "<div style='text-align:center;margin:24px 0;'>";
    h += "<a href='https://votacion-portal.vercel.app' style='background:#1B5E20;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;'>Ir al sistema de votacion</a>";
    h += "</div>";
    h += "</div>";
    h += "<div style='background:#f5f5f5;padding:16px 32px;text-align:center;border-top:1px solid #eee;'>";
    h += "<p style='font-size:11px;color:#999;margin:0;'>Agrupacion El Portal de Tocancipa - Votacion digital 2026</p>";
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
