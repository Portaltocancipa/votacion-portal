// =====================================================
// EXTRACTOR - Certificados de Tradicion y Libertad
// REQUISITO: Servicios > Drive API (habilitar antes de correr)
// Sheet: https://docs.google.com/spreadsheets/d/11t2ejucApu-q9gbD_SbBE_RQ2QAqkBt6vUwfOqM0-9c
// Carpeta Drive (copia de los PDF originales):
//   https://drive.google.com/drive/folders/1HI2aKK_3ovb7dnEEqBenw687BwVk-Dth
//
// DOS FORMAS DE CORRERLO:
//  - extraerCertificados(): busca solo por los asuntos conocidos
//    (notariado + "Documento de..." del administrador). Rapido, es el
//    que corre solo cada viernes via trigger.
//  - escanearTodoPDF(): revisa TODOS los correos con CUALQUIER PDF
//    adjunto (sin filtrar por asunto), por si algun certificado llega
//    con un asunto que no reconocemos. Es lento (le hace OCR a cada
//    PDF para decidir si es un certificado o no), por eso procesa solo
//    un lote por ejecucion (LIMITE_HILOS_ESCANEO) para no exceder el
//    limite de 6 minutos de Apps Script. Correla varias veces seguidas
//    hasta que el log diga "No quedan hilos por revisar" -- cada
//    correo que ya se reviso queda marcado con un label y no se vuelve
//    a tocar en la siguiente corrida.
// =====================================================

var SHEET_ID            = "11t2ejucApu-q9gbD_SbBE_RQ2QAqkBt6vUwfOqM0-9c";
var FOLDER_ID           = "1HI2aKK_3ovb7dnEEqBenw687BwVk-Dth";
var LABEL_NAME          = "Certificados/Procesado";
var LABEL_NAME_SKIP     = "Certificados/No-Certificado";
var LIMITE_HILOS_ESCANEO = 15;

// -------------------------------------------------------
// Corre sola cada viernes (via trigger). Busqueda acotada a los
// asuntos conocidos -- rapida, no le hace OCR a correos ajenos.
// -------------------------------------------------------
function extraerCertificados() {
  var query = '(subject:"Certificado de Tradicion y Libertad" OR subject:"Documento de") ' +
              'after:2024/01/01 in:anywhere -label:"' + LABEL_NAME + '" -label:"' + LABEL_NAME_SKIP + '"';
  correr(query, null);
}

// -------------------------------------------------------
// Correrla MANUALMENTE cuantas veces haga falta para barrer el
// historial completo: revisa CUALQUIER correo con PDF adjunto (sin
// filtrar por asunto), pero solo un lote de LIMITE_HILOS_ESCANEO
// hilos por ejecucion, para no exceder el limite de tiempo.
// -------------------------------------------------------
function escanearTodoPDF() {
  var query = 'filename:pdf after:2024/01/01 in:anywhere -label:"' + LABEL_NAME + '" -label:"' + LABEL_NAME_SKIP + '"';
  correr(query, LIMITE_HILOS_ESCANEO);
}

// -------------------------------------------------------
// Logica compartida por ambas funciones de arriba.
// limiteHilos: null = sin limite (usar solo con busquedas acotadas);
// un numero = procesa maximo esa cantidad de hilos en esta ejecucion.
// -------------------------------------------------------
function correr(query, limiteHilos) {
  var ss       = SpreadsheetApp.openById(SHEET_ID);
  var sheet    = ss.getSheets()[0];
  var folder   = DriveApp.getFolderById(FOLDER_ID);
  var label     = GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME);
  var labelSkip = GmailApp.getUserLabelByName(LABEL_NAME_SKIP) || GmailApp.createLabel(LABEL_NAME_SKIP);

  // Matriculas ya registradas para evitar duplicados
  var existentes = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var matriculasCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < matriculasCol.length; r++) {
      if (matriculasCol[r][0]) existentes[String(matriculasCol[r][0]).trim()] = true;
    }
  }

  var threads = GmailApp.search(query);
  Logger.log("Hilos encontrados: " + threads.length + (limiteHilos ? " (procesando maximo " + limiteHilos + " en esta corrida)" : ""));

  var procesados    = 0;
  var duplicados    = 0;
  var errores       = 0;
  var noCertificado = 0;
  var hilosRevisados = 0;

  for (var t = 0; t < threads.length; t++) {
    if (limiteHilos && hilosRevisados >= limiteHilos) {
      Logger.log("Limite de lote alcanzado (" + limiteHilos + " hilos). Vuelve a correr esta funcion para seguir con el resto.");
      break;
    }
    var thread   = threads[t];
    var mensajes = thread.getMessages();
    Logger.log("Hilo #" + t + ' - asunto: "' + thread.getFirstMessageSubject() + '" - mensajes: ' + mensajes.length);

    for (var m = 0; m < mensajes.length; m++) {
      var adjuntos = mensajes[m].getAttachments({ includeAttachments: true, includeInlineImages: false });
      if (adjuntos.length > 0) {
        Logger.log("  Mensaje #" + m + " de " + mensajes[m].getFrom() + " - adjuntos: " + adjuntos.length);
      }
      for (var a = 0; a < adjuntos.length; a++) {
        // El notariado a veces manda el PDF como application/octet-stream:
        // aceptamos por tipo real O por extension del nombre de archivo.
        var esPdf = adjuntos[a].getContentType() === "application/pdf" ||
                    /\.pdf$/i.test(adjuntos[a].getName());
        if (!esPdf) continue;
        Logger.log("    Adjunto: " + adjuntos[a].getName() + " | tipo: " + adjuntos[a].getContentType());
        try {
          var texto = pdfATexto(adjuntos[a]);

          // Validar por contenido que SI es un certificado de tradicion y
          // libertad (sin importar asunto/remitente/nombre de archivo)
          var esCertificado = /CERTIFICADO\s+DE\s+TRADICION/i.test(texto) &&
                              /MATRICULA\s+INMOBILIARIA/i.test(texto);
          if (!esCertificado) {
            Logger.log("    NO ES CERTIFICADO (omitido) - adjunto: " + adjuntos[a].getName());
            thread.addLabel(labelSkip);
            noCertificado++;
            continue;
          }

          var datos = extraerDatos(texto);
          Logger.log("    Anotaciones encontradas en este PDF: " + datos.totalAnotaciones);

          // Respaldo: si el PDF no arrojo matricula, el cuerpo del correo
          // suele decir "...asociado a la Matricula 78013..."
          if (!datos.matricula) {
            var cuerpo = mensajes[m].getPlainBody();
            var mBody = cuerpo.match(/Matr[íi]cula\s+([0-9\-]+)/i);
            if (mBody) {
              datos.matricula = mBody[1].trim();
              Logger.log("    Matricula obtenida del cuerpo del correo: " + datos.matricula);
            }
          }

          if (!datos.matricula) {
            Logger.log("SIN MATRICULA - correo: " + mensajes[m].getSubject());
            errores++;
            continue;
          }

          if (existentes[datos.matricula]) {
            Logger.log("DUPLICADO - Matricula: " + datos.matricula);
            thread.addLabel(label);
            duplicados++;
            continue;
          }

          // Guardar copia del PDF original en la carpeta de Drive
          guardarPdfEnDrive(adjuntos[a], datos, folder);

          sheet.appendRow([
            datos.matricula,
            datos.apto,
            datos.interior,
            datos.ultimaAnotacion,
            datos.anteriorAnotacion
          ]);

          existentes[datos.matricula] = true;
          thread.addLabel(label);
          Logger.log("OK - " + datos.matricula + " | Apto " + datos.apto + " Int " + datos.interior);
          procesados++;
          Utilities.sleep(1000);

        } catch(e) {
          Logger.log("ERROR - " + mensajes[m].getSubject() + ": " + e.message);
          errores++;
        }
      }
    }
    hilosRevisados++;
  }

  if (limiteHilos && threads.length > hilosRevisados) {
    Logger.log("Quedan aprox. " + (threads.length - hilosRevisados) + " hilos por revisar en la proxima corrida.");
  } else if (limiteHilos) {
    Logger.log("No quedan hilos por revisar.");
  }

  Logger.log("=== RESULTADO ===");
  Logger.log("Procesados: " + procesados);
  Logger.log("Duplicados omitidos: " + duplicados);
  Logger.log("No eran certificados: " + noCertificado);
  Logger.log("Errores: " + errores);
}

// -------------------------------------------------------
// Ejecutar UNA SOLA VEZ (manualmente) para dejar el trigger
// semanal configurado: todos los viernes ~6:00 AM.
// Es seguro volver a correrla: borra el trigger anterior de
// extraerCertificados antes de crear el nuevo, no se duplica.
// -------------------------------------------------------
function configurarTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "extraerCertificados") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("extraerCertificados")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(6)
    .nearMinute(0)
    .create();

  Logger.log("Trigger configurado: todos los viernes cerca de las 6:00 AM.");
  Logger.log("Verifica que el huso horario del proyecto sea America/Bogota en Configuracion del proyecto (icono de engranaje).");
}

// -------------------------------------------------------
// Guarda el PDF original (sin OCR) en la carpeta de Drive,
// con un nombre que permite ubicarlo por matricula/apto
// -------------------------------------------------------
function guardarPdfEnDrive(adjunto, datos, folder) {
  var nombre = "Certificado_" + datos.matricula;
  if (datos.apto)     nombre += "_Apto" + datos.apto;
  if (datos.interior) nombre += "_Int" + datos.interior;
  nombre += ".pdf";

  var blob = adjunto.copyBlob().setContentType("application/pdf").setName(nombre);
  folder.createFile(blob);
}

// -------------------------------------------------------
// Convierte PDF a texto via OCR de Google Drive
// -------------------------------------------------------
function pdfATexto(adjunto) {
  var blob = adjunto.copyBlob().setContentType("application/pdf");

  var file = Drive.Files.create(
    { name: "temp_ocr_cert", mimeType: "application/vnd.google-apps.document" },
    blob,
    { ocr: true, ocrLanguage: "es" }
  );

  Utilities.sleep(3000); // Esperar que Drive procese el OCR

  var doc  = DocumentApp.openById(file.id);
  var text = doc.getBody().getText();

  Drive.Files.remove(file.id); // Borrar archivo temporal

  return text;
}

// -------------------------------------------------------
// Extrae los campos del texto del PDF
// -------------------------------------------------------
function extraerDatos(texto) {
  var t = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // --- Nro Matricula ---
  var matricula = "";
  var mM = t.match(/Nro\.?\s*Matr[íi]cula[:\s]+([0-9\-]+)/i);
  if (mM) matricula = mM[1].trim();

  // --- Apto ---
  var apto = "";
  var aM = t.match(/APTO\.?\s*([A-Z0-9]+)/i);
  if (aM) apto = aM[1].trim();

  // --- Interior ---
  var interior = "";
  var iM = t.match(/INTERIOR\s+([A-Z0-9]+)/i);
  if (iM) interior = iM[1].trim();

  // --- Anotaciones: buscar todas ---
  // Se parte el texto por cada "ANOTACION: Nro" para obtener un bloque por
  // anotacion, y dentro de cada bloque se buscan "Doc:" y "ESPECIFICACION:"
  // sin exigir que esten en lineas consecutivas -- el PDF real intercala
  // lineas como "Se cancela anotacion No: X" o saltos de pagina (con el
  // encabezado/pie repetido de la ORIP) entre Doc y ESPECIFICACION, y el
  // patron anterior (linea por linea) se saltaba esas anotaciones enteras.
  var anotaciones = [];
  var bloques = t.split(/ANOTACION:\s*Nro\s+/i).slice(1);
  for (var b = 0; b < bloques.length; b++) {
    var bloque  = bloques[b];
    var mNro    = bloque.match(/^(\d+)/);
    if (!mNro) continue;
    var mFecha  = bloque.match(/Fecha:\s*([\d\-]+)/i);
    var mDoc    = bloque.match(/Doc:[^\n]+/i);
    var mEsp    = bloque.match(/ESPECIFICACION:[^\n]+/i);

    var partes = ["Nro " + mNro[1]];
    if (mFecha) partes.push("Fecha " + mFecha[1].trim());
    if (mDoc)   partes.push(mDoc[0].trim());
    if (mEsp)   partes.push(mEsp[0].trim());
    anotaciones.push(partes.join(" | "));
  }

  // Respaldo por si el documento no trae ningun bloque reconocible
  if (anotaciones.length === 0) {
    var re2 = /ANOTACION:\s*Nro\s+(\d+)\s+Fecha:\s*([\d\-]+)/gi;
    var match;
    while ((match = re2.exec(t)) !== null) {
      anotaciones.push("Nro " + match[1] + " | Fecha " + match[2]);
    }
  }

  var ultimaAnotacion    = anotaciones.length > 0 ? anotaciones[anotaciones.length - 1] : "";
  var anteriorAnotacion  = anotaciones.length > 1 ? anotaciones[anotaciones.length - 2] : "";

  return {
    matricula:         matricula,
    apto:              apto,
    interior:          interior,
    ultimaAnotacion:   ultimaAnotacion,
    anteriorAnotacion: anteriorAnotacion,
    totalAnotaciones:  anotaciones.length
  };
}
