/**
 * Sincroniza NovaConnect360 (base de propietarios/residentes) contra el
 * Google Sheet oficial de esta pestaña (1VVAIXCdyx... -- el mismo que
 * llena exportar-sheets.gs). El Sheet es la UNICA base oficial; Nova es un
 * satelite que debe reflejarla. Corre sola cada 72 horas.
 *
 * Como funciona Nova (confirmado en vivo el 2026-10-16, con el usuario
 * logueado y navegando mientras se inspeccionaba el trafico de red):
 *   - No existe una pantalla separada de "Propietarios" (/administracion/
 *     propietarios.php da 404). Todo vive en una sola lista por unidad
 *     (residentes.php), con un campo "estatus" que distingue "Residentes"
 *     (dueño=no) de "Propietario". OJO con el valor exacto: el dropdown de
 *     Nova solo acepta "Residentes" o "Propietario" -- ya se encontro un
 *     registro real (Sol Maritza Cusba, unidad 3202) con estatus="RESIDENTE"
 *     (mayusculas), que Nova guardo sin problema porque el backend no
 *     valida contra el dropdown, pero esa pantalla no lo muestra bien. Este
 *     script SIEMPRE escribe exactamente "Residentes" o "Propietario".
 *   - Cada unidad tiene un id_lugar interno de Nova (no es lo mismo que
 *     nuestro codigo de unidad "3202"). El mapa completo esta mas abajo
 *     (UNIDAD_A_ID_LUGAR), sacado de los botones <div class="combo-item">
 *     de residentes.php. Unidad 3201 NO existe como id_lugar en Nova (se
 *     confirmo en vivo) -- esa y cualquier otra unidad que falte queda
 *     registrada en el reporte, nunca se inventa un id_lugar.
 *   - Leer:   GET  BD_SearchResidentes.php?id_lugar=N&q=&f_estatus=&f_notificacion=&f_celular=&f_email=
 *             -> {"ok":true,"items":[{id_residente,nombre,identificacion,celular,email,
 *                 foto,notificacion,llamada,estatus,id_lugar,unidad}],"total":N}
 *   - Corregir: POST BD_UpdateResidente.php  (JSON)
 *             {id_residente, notificacion, celular, estatus, nombre, identificacion, email, llamada}
 *             notificacion/llamada se preservan tal cual los tiene Nova (son
 *             preferencias de Nova, no datos que vengan del Sheet).
 *   - Crear:    POST BD_InsertResidente.php  (JSON)
 *             {id_lugar, notificacion, celular, estatus, nombre, identificacion, email}
 *             Nova EXIGE nombre + identificacion no vacios para crear -- si
 *             el Sheet no tiene numero de documento para esa persona, no se
 *             puede crear en Nova y queda en el reporte como pendiente.
 *
 * Decision importante -- lo unico que este script NO automatiza:
 *   Si Nova tiene una persona que no aparece en el Sheet para esa unidad
 *   (ej. ya se encontro "sebastian" id=12 y el propio usuario como residente
 *   de la 3202, ninguno de los dos en el Sheet), el script NO la borra
 *   automaticamente. Puede ser una persona real que al Sheet le hace falta
 *   capturar, no necesariamente un error de Nova -- borrar gente de un
 *   sistema que no es nuestro por una ausencia en el Sheet es un riesgo de
 *   perder un dato real que no se puede recuperar. Queda listada en el
 *   reporte como "Extra en Nova (sin corresponder)" para revisar aparte.
 *   Crear y corregir SI son automaticos (son estrictamente a favor del
 *   Sheet, nunca pueden perder informacion real).
 *
 * INSTALACION (una sola vez, en el MISMO proyecto de Apps Script de
 * exportar-sheets.gs -- ya esta atado a este Sheet):
 * 1. "Configuracion del proyecto" -> "Propiedades del script" -> agregar:
 *    NOVA_USER = 1070009629
 *    NOVA_PASS = 9629
 *    (Las mismas credenciales que ya usan enviar-tokens-checklist / los
 *    otros scripts de Nova de este cliente.)
 * 2. Correr "diagnosticarConexionNova" para confirmar login OK.
 * 3. Correr "sincronizarNovaConSheet" una vez a mano para la primera pasada
 *    y revisar la pestaña "Sync Nova" que deja como reporte.
 * 4. Correr "crearTriggerNova" para dejarlo automatico cada 72 horas.
 */

const NOVA_BASE = 'https://novaconnect360.com';
const SHEET_ID_NOVA = '1VVAIXCdyx-H6Z34Yeno0pEtFzQXKu_aknxgK0mTHo68';
const PESTANA_SYNC = 'Sync Nova';

// Unidad (como esta en nuestro Sheet) -> id_lugar interno de Nova. Sacado en
// vivo de residentes.php el 2026-10-16. Si Nova agrega una unidad nueva no
// va a aparecer aqui -- sincronizarNovaConSheet() lo detecta y lo deja en
// el reporte como "Unidad no existe en Nova" en vez de fallar en silencio;
// para corregirlo hay que volver a sacar el mapa completo de residentes.php
// (ver combo-item en el HTML) y agregar la unidad faltante aqui a mano.
const UNIDAD_A_ID_LUGAR = {
  '1101':14852,'1102':14853,'1201':14854,'1202':14855,'1301':14856,'1401':14857,'1402':14858,'1501':14859,'1502':14860,
  '2101':14861,'2102':14862,'2201':14863,'2202':14864,'2301':14865,'2302':14866,'2401':14867,'2402':14868,'2501':14869,'2502':14870,
  '3101':14871,'3102':14872,'3202':14873,'3301':14874,'3302':14875,'3401':14876,'3402':14877,'3501':14878,'3502':14879,
  '4101':14880,'4102':14881,'4201':14882,'4202':14883,'4301':14884,'4302':14885,'4401':14886,'4402':14887,'4501':14888,'4502':14889,
  '5101':14890,'5102':14891,'5201':14892,'5202':14893,'5301':14894,'5302':14895,'5401':14896,'5402':14897,'5501':14898,'5502':14899,
  '6101':14900,'6102':14901,'6201':14902,'6202':14903,'6301':14904,'6302':14905,'6401':14906,'6402':14907,'6501':14908,'6502':14909,
  '7101':14910,'7102':14911,'7201':14912,'7202':14913,'7301':14914,'7302':14915,'7401':14916,'7402':14917,'7501':14918,'7502':14919,
  '8101':14920,'8102':14921,'8201':14922,'8202':14923,'8301':14924,'8302':14925,'8401':14926,'8402':14927,'8501':14928,'8502':14929,
};

// ---------------------------------------------------------------------------
// ENTRADA PRINCIPAL
// ---------------------------------------------------------------------------

function sincronizarNovaConSheet() {
  const cookie = novaLogin_();
  const ss = SpreadsheetApp.openById(SHEET_ID_NOVA);

  const esperadosPorUnidad = leerEsperadosDelSheet_(ss);
  const reporte = [];
  let creados = 0, actualizados = 0, sinCambios = 0, extras = 0, pendientes = 0, unidadesFaltantes = 0;

  for (const unidad in esperadosPorUnidad) {
    const idLugar = UNIDAD_A_ID_LUGAR[unidad];
    if (!idLugar) {
      esperadosPorUnidad[unidad].forEach(p => {
        reporte.push([new Date(), unidad, p.nombreCompleto, 'Unidad no existe en Nova', 'No se pudo revisar -- falta mapear esta unidad en UNIDAD_A_ID_LUGAR']);
      });
      unidadesFaltantes++;
      continue;
    }

    const novaItems = buscarResidentesNova_(cookie, idLugar);
    const usados = new Set();

    esperadosPorUnidad[unidad].forEach(p => {
      const match = emparejar_(p, novaItems, usados);
      if (!match) {
        if (!p.identificacion) {
          reporte.push([new Date(), unidad, p.nombreCompleto, 'Pendiente (sin identificacion)', 'El Sheet no tiene numero de documento -- Nova exige identificacion para crear, no se pudo']);
          pendientes++;
          return;
        }
        try {
          crearResidenteNova_(cookie, idLugar, p);
          reporte.push([new Date(), unidad, p.nombreCompleto, 'Creado', 'No existia en Nova, se creo con los datos del Sheet']);
          creados++;
        } catch (e) {
          reporte.push([new Date(), unidad, p.nombreCompleto, 'ERROR al crear', e.message]);
        }
        return;
      }

      usados.add(match.id_residente);
      const cambios = diferenciasParaActualizar_(p, match);
      if (Object.keys(cambios).length === 0) {
        sinCambios++;
        return;
      }
      try {
        actualizarResidenteNova_(cookie, match, cambios);
        reporte.push([new Date(), unidad, p.nombreCompleto, 'Actualizado', Object.entries(cambios).map(([k, v]) => k + ': "' + match[k] + '" -> "' + v + '"').join(' | ')]);
        actualizados++;
      } catch (e) {
        reporte.push([new Date(), unidad, p.nombreCompleto, 'ERROR al actualizar', e.message]);
      }
    });

    novaItems.forEach(it => {
      if (!usados.has(it.id_residente)) {
        reporte.push([new Date(), unidad, it.nombre, 'Extra en Nova (sin corresponder)', 'No se encontro en el Sheet -- no se borra automaticamente, revisar a mano']);
        extras++;
      }
    });
  }

  escribirReporte_(ss, reporte);
  Logger.log('Sincronizacion Nova: ' + creados + ' creados, ' + actualizados + ' actualizados, ' + sinCambios + ' sin cambios, '
    + extras + ' extras en Nova sin corresponder, ' + pendientes + ' pendientes sin identificacion, ' + unidadesFaltantes + ' unidades sin mapear.');
}

// ---------------------------------------------------------------------------
// LEER "ESPERADOS" DEL SHEET OFICIAL (Residentes + Propietarios)
// ---------------------------------------------------------------------------

/** Lee las pestañas Residentes y Propietarios (las que llena exportar-sheets.gs)
 *  y arma, por unidad, la lista de personas que DEBERIAN existir en Nova.
 *  Se saltan las filas marcadas Eliminado = "Sí" -- esas no deben estar en
 *  Nova tampoco, pero este script no las borra de Nova si ya estaban (ver
 *  nota de "Extra en Nova" mas arriba); simplemente no las vuelve a crear. */
function leerEsperadosDelSheet_(ss) {
  const resultado = {};

  const agregar = (sheet, estatusNova, colUnidad, colNombres, colApellidos, colDoc, colTel, colCorreo, colElim) => {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      if (String(fila[colElim]).trim().toLowerCase() === 'sí') continue;
      const unidad = String(fila[colUnidad]).trim();
      if (!unidad) continue;
      const nombreCompleto = (String(fila[colNombres]).trim() + ' ' + String(fila[colApellidos]).trim()).trim();
      if (!nombreCompleto) continue;
      const persona = {
        nombreCompleto: nombreCompleto,
        identificacion: String(fila[colDoc] || '').trim(),
        celular: String(fila[colTel] || '').trim(),
        email: String(fila[colCorreo] || '').trim(),
        estatusNova: estatusNova,
      };
      if (!resultado[unidad]) resultado[unidad] = [];
      resultado[unidad].push(persona);
    }
  };

  // Columnas segun exportar-sheets.gs: Residentes = [ID,Unidad,Nombres,Apellidos,
  // Tipo doc,Num doc,Fecha nac,Telefono,Correo,Eliminado,...] (0-indexado)
  const shResidentes = ss.getSheetByName('Residentes');
  if (shResidentes) agregar(shResidentes, 'Residentes', 1, 2, 3, 5, 6, 7, 8);

  // Propietarios = [ID,Unidad,Nombres,Apellidos,Tipo doc,Num doc,Fecha nac,
  // Telefono,Correo,Direccion,Ciudad,Eliminado]
  const shPropietarios = ss.getSheetByName('Propietarios');
  if (shPropietarios) agregar(shPropietarios, 'Propietario', 1, 2, 3, 5, 6, 7, 11);

  return resultado;
}

// ---------------------------------------------------------------------------
// EMPAREJAR Sheet <-> Nova
// ---------------------------------------------------------------------------

function normalizar_(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Primero intenta por identificacion exacta (la llave mas confiable); si
 *  no hay identificacion de un lado o del otro, cae a nombre normalizado. */
function emparejar_(persona, novaItems, usados) {
  if (persona.identificacion) {
    const porDoc = novaItems.find(it => !usados.has(it.id_residente) && it.identificacion && it.identificacion.trim() === persona.identificacion);
    if (porDoc) return porDoc;
  }
  const nombreNorm = normalizar_(persona.nombreCompleto);
  return novaItems.find(it => !usados.has(it.id_residente) && normalizar_(it.nombre) === nombreNorm) || null;
}

/** Devuelve solo los campos que de verdad hay que cambiar -- nunca
 *  sobreescribe un dato real de Nova con un campo vacio del Sheet. */
function diferenciasParaActualizar_(persona, novaItem) {
  const cambios = {};
  if (persona.nombreCompleto && normalizar_(persona.nombreCompleto) !== normalizar_(novaItem.nombre)) cambios.nombre = persona.nombreCompleto;
  if (persona.identificacion && persona.identificacion !== String(novaItem.identificacion || '').trim()) cambios.identificacion = persona.identificacion;
  if (persona.celular && persona.celular !== String(novaItem.celular || '').trim()) cambios.celular = persona.celular;
  if (persona.email && persona.email !== String(novaItem.email || '').trim()) cambios.email = persona.email;
  if (persona.estatusNova !== String(novaItem.estatus || '').trim()) cambios.estatus = persona.estatusNova;
  return cambios;
}

// ---------------------------------------------------------------------------
// NOVA: login + llamadas
// ---------------------------------------------------------------------------

function novaLogin_() {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty('NOVA_USER');
  const pass = props.getProperty('NOVA_PASS');
  if (!user || !pass) throw new Error('Faltan NOVA_USER / NOVA_PASS en Propiedades del script.');

  const resp = UrlFetchApp.fetch(NOVA_BASE + '/login/validar.php', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: 'user=' + encodeURIComponent(user) + '&password=' + encodeURIComponent(pass),
    followRedirects: false,
    muteHttpExceptions: true,
  });
  const headers = resp.getAllHeaders();
  const location = headers['Location'] || headers['location'] || '';
  const setCookie = headers['Set-Cookie'] || headers['set-cookie'];
  let cookie = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : (setCookie ? setCookie.split(';')[0] : '');

  if (cookie.indexOf('PHPSESSID') === -1 || location.indexOf('administracion') === -1) {
    throw new Error('Login a Nova fallo (HTTP ' + resp.getResponseCode() + ', Location: ' + location + ').');
  }
  return cookie;
}

function buscarResidentesNova_(cookie, idLugar) {
  const resp = UrlFetchApp.fetch(NOVA_BASE + '/administracion/BD_SearchResidentes.php?id_lugar=' + idLugar + '&q=&f_estatus=&f_notificacion=&f_celular=&f_email=', {
    headers: { Cookie: cookie },
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) throw new Error('BD_SearchResidentes HTTP ' + resp.getResponseCode());
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) throw new Error('BD_SearchResidentes respondio ok:false');
  return data.items || [];
}

/** Envia SOLO los campos que cambiaron, de resto preserva exactamente lo
 *  que Nova ya tenia (incluye notificacion/llamada, que son preferencias
 *  de Nova y no vienen del Sheet). */
function actualizarResidenteNova_(cookie, novaItem, cambios) {
  const payload = {
    id_residente: String(novaItem.id_residente),
    notificacion: String(novaItem.notificacion),
    celular: cambios.celular !== undefined ? cambios.celular : (novaItem.celular || ''),
    estatus: cambios.estatus !== undefined ? cambios.estatus : (novaItem.estatus || ''),
    nombre: cambios.nombre !== undefined ? cambios.nombre : (novaItem.nombre || ''),
    identificacion: cambios.identificacion !== undefined ? cambios.identificacion : (novaItem.identificacion || ''),
    email: cambios.email !== undefined ? cambios.email : (novaItem.email || ''),
    llamada: String(novaItem.llamada),
  };
  const resp = UrlFetchApp.fetch(NOVA_BASE + '/administracion/BD_UpdateResidente.php', {
    method: 'post',
    contentType: 'application/json',
    headers: { Cookie: cookie },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200 || !data.ok) throw new Error('BD_UpdateResidente HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
}

function crearResidenteNova_(cookie, idLugar, persona) {
  const payload = {
    id_lugar: String(idLugar),
    notificacion: '1', // Permitir -- valor por defecto para una persona nueva, no viene del Sheet
    celular: persona.celular || '',
    estatus: persona.estatusNova,
    nombre: persona.nombreCompleto,
    identificacion: persona.identificacion,
    email: persona.email || '',
  };
  const resp = UrlFetchApp.fetch(NOVA_BASE + '/administracion/BD_InsertResidente.php', {
    method: 'post',
    contentType: 'application/json',
    headers: { Cookie: cookie },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200 || !data.ok) throw new Error('BD_InsertResidente HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
}

// ---------------------------------------------------------------------------
// REPORTE
// ---------------------------------------------------------------------------

function escribirReporte_(ss, filas) {
  let sheet = ss.getSheetByName(PESTANA_SYNC);
  if (!sheet) sheet = ss.insertSheet(PESTANA_SYNC);
  sheet.clear();
  const headers = ['Fecha', 'Unidad', 'Persona', 'Accion', 'Detalle'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (filas.length > 0) {
    sheet.getRange(2, 1, filas.length, headers.length).setValues(filas);
    sheet.getRange(2, 1, filas.length, 1).setNumberFormat('yyyy-MM-dd HH:mm');
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// ---------------------------------------------------------------------------
// INSTALACION / PRUEBAS
// ---------------------------------------------------------------------------

function diagnosticarConexionNova() {
  try {
    const cookie = novaLogin_();
    const items = buscarResidentesNova_(cookie, UNIDAD_A_ID_LUGAR['3202']);
    Logger.log('Conexion a Nova OK. Unidad 3202 tiene ' + items.length + ' personas en Nova ahora mismo.');
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
}

function crearTriggerNova() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sincronizarNovaConSheet') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarNovaConSheet').timeBased().everyDays(3).atHour(5).nearMinute(0).create();
  Logger.log('Trigger instalado: sincronizarNovaConSheet corre cada 3 dias (72h) a las 5:00 a.m.');
}

function borrarTriggerNova() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sincronizarNovaConSheet') ScriptApp.deleteTrigger(t);
  });
  Logger.log('Trigger de sincronizarNovaConSheet eliminado.');
}
