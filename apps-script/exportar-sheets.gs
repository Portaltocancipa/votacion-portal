/**
 * Exporta a Google Sheets los registros de Supabase del proyecto
 * votacion-portal (Agrupación El Portal de Tocancipá): Residentes,
 * Propietarios, Parqueaderos, Mascotas y Bicicletas -- una pestaña por
 * tabla, con columnas fijas y legibles (no el dump crudo de Supabase).
 *
 * Antes de usar: en el editor de Apps Script, ir a Configuración del
 * proyecto -> Propiedades del script y crear:
 *   SUPABASE_URL              -> la "Project URL" de Supabase
 *   SUPABASE_SERVICE_ROLE_KEY -> la clave "service_role" (secreta)
 * Nunca pegar esas claves directamente en este archivo.
 */

const SHEET_ID = '1VVAIXCdyx-H6Z34Yeno0pEtFzQXKu_aknxgK0mTHo68';

// Cada pestaña: tabla de Supabase, nombre de la pestaña, y las columnas a
// mostrar en orden (campo real de la tabla -> encabezado legible). La
// columna "ID" (secuencia 1,2,3...) se agrega sola, no hace falta listarla.
const TABLAS = [
  {
    tabla: 'residentes', pestana: 'Residentes',
    columnas: [
      ['unidad', 'Unidad'], ['nombres', 'Nombres'], ['apellidos', 'Apellidos'],
      ['tipo_documento', 'Tipo de documento'], ['numero_documento', 'Número de documento'],
      ['fecha_nacimiento', 'Fecha de nacimiento'], ['telefono', 'Teléfono'], ['correo', 'Correo'],
      ['eliminado', 'Eliminado'], ['es_titular_arriendo', 'Es titular arriendo'],
      ['inmueble_arrendado', 'Inmueble arrendado'], ['tiene_discapacidad', 'Tiene discapacidad'],
      ['discapacidades', 'Discapacidades'], ['discapacidad_otro', 'Discapacidad otro'],
    ],
  },
  {
    tabla: 'propietarios', pestana: 'Propietarios',
    columnas: [
      ['unidad', 'Unidad'], ['nombres', 'Nombres'], ['apellidos', 'Apellidos'],
      ['tipo_documento', 'Tipo de documento'], ['numero_documento', 'Número de documento'],
      ['fecha_nacimiento', 'Fecha de nacimiento'], ['telefono', 'Teléfono'], ['correo', 'Correo'],
      ['direccion', 'Dirección'], ['ciudad', 'Ciudad'], ['eliminado', 'Eliminado'],
    ],
  },
  {
    tabla: 'parqueaderos', pestana: 'Parqueaderos',
    columnas: [
      ['unidad', 'Unidad'], ['nombres', 'Nombres'], ['apellidos', 'Apellidos'],
      ['placa', 'Placa'], ['marca', 'Marca'], ['modelo', 'Modelo'],
      ['tipo_vehiculo', 'Tipo de vehículo'], ['eliminado', 'Eliminado'],
    ],
  },
  {
    tabla: 'mascotas', pestana: 'Mascotas',
    columnas: [
      ['unidad', 'Unidad'], ['especie', 'Especie'], ['nombre', 'Nombre'], ['raza', 'Raza'],
      ['edad', 'Edad'], ['tamano', 'Tamaño'], ['eliminado', 'Eliminado'],
    ],
  },
  {
    tabla: 'bicicletas', pestana: 'Bicicletas',
    columnas: [
      ['unidad', 'Unidad'], ['color', 'Color'], ['marca', 'Marca'],
      ['en_bicicletero', 'En bicicletero'], ['numero_asignado', 'Número asignado'],
      ['eliminado', 'Eliminado'],
    ],
  },
];

/**
 * Instala el trigger que corre exportarTodoDesdeSupabase() dos veces al día
 * (8:00 a.m. y 6:00 p.m., hora Bogotá). Ejecutar una sola vez. Si ya existía
 * un trigger de esta función, lo reemplaza (evita duplicados si se corre
 * más de una vez).
 */
function instalarTriggerExportacion() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'exportarTodoDesdeSupabase') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('exportarTodoDesdeSupabase')
    .timeBased().atHour(8).nearMinute(0).everyDays(1).inTimezone('America/Bogota').create();
  ScriptApp.newTrigger('exportarTodoDesdeSupabase')
    .timeBased().atHour(18).nearMinute(0).everyDays(1).inTimezone('America/Bogota').create();

  Logger.log('Trigger instalado: exportarTodoDesdeSupabase corre a las 8:00 a.m. y 6:00 p.m. (Bogotá).');
}

/**
 * Prueba la conexión a Supabase antes de exportar todo (trae 1 fila de
 * "residentes"). Ejecutar primero para confirmar que las Propiedades del
 * script están bien configuradas.
 */
function diagnosticarConexion() {
  try {
    const filas = consultarSupabase_('residentes', 1);
    Logger.log('Conexión OK. Ejemplo de fila: ' + JSON.stringify(filas[0] || {}));
  } catch (e) {
    Logger.log('ERROR de conexión: ' + e.message);
  }
}

/**
 * Exporta las 5 tablas a sus respectivas pestañas del Sheet configurado.
 */
function exportarTodoDesdeSupabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let totalGeneral = 0;

  TABLAS.forEach(function (t) {
    try {
      const filas = consultarSupabase_(t.tabla);
      escribirEnPestana_(ss, t.pestana, t.columnas, filas);
      Logger.log(t.pestana + ': ' + filas.length + ' filas exportadas.');
      totalGeneral += filas.length;
    } catch (e) {
      Logger.log('ERROR exportando ' + t.tabla + ': ' + e.message);
    }
  });

  Logger.log('Exportación completa. Total de filas: ' + totalGeneral);
}

/**
 * Trae todas las filas (o un límite) de una tabla de Supabase vía REST/PostgREST.
 */
function consultarSupabase_(tabla, limite) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('SUPABASE_URL');
  const key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las Propiedades del script.');
  }

  let endpoint = url.replace(/\/$/, '') + '/rest/v1/' + tabla + '?select=*';
  if (limite) endpoint += '&limit=' + limite;

  const res = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    muteHttpExceptions: true,
  });

  const codigo = res.getResponseCode();
  if (codigo !== 200) {
    throw new Error('HTTP ' + codigo + ' consultando ' + tabla + ': ' + res.getContentText());
  }
  return JSON.parse(res.getContentText());
}

/**
 * Escribe las filas en una pestaña, con columna de secuencia (A) + las
 * columnas fijas definidas en TABLAS, ordenadas por unidad y fecha de
 * creación. Crea la pestaña si no existe.
 */
function escribirEnPestana_(ss, nombrePestana, columnas, filas) {
  let sheet = ss.getSheetByName(nombrePestana);
  if (!sheet) {
    sheet = ss.insertSheet(nombrePestana);
  } else {
    sheet.clear();
  }

  filas.sort(function (a, b) {
    const ua = a.unidad || '', ub = b.unidad || '';
    if (ua !== ub) return ua < ub ? -1 : 1;
    const ca = a.created_at || '', cb = b.created_at || '';
    return ca < cb ? -1 : (ca > cb ? 1 : 0);
  });

  const headers = ['ID'].concat(columnas.map(function (c) { return c[1]; }));
  const datos = [headers].concat(filas.map(function (fila, i) {
    return [i + 1].concat(columnas.map(function (c) { return formatearCelda_(fila[c[0]]); }));
  }));

  if (filas.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    sheet.getRange(1, 1, datos.length, headers.length).setValues(datos);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

function formatearCelda_(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return valor.join(', ');
  // Un texto que empieza con = + - @ lo toma Sheets como el inicio de una
  // fórmula (ej. un teléfono "+57 315 2337126" queda en #ERROR!). El '
  // al inicio fuerza que quede como texto plano, igual que al escribirlo
  // a mano en una celda.
  if (typeof valor === 'string' && /^[=+\-@]/.test(valor)) return "'" + valor;
  return valor;
}
