/**
 * Gestión del Google Form PODER DE REPRESENTACIÓN
 * Asamblea General Extraordinaria — Agrupación de Vivienda Portal de Tocancipá P.H.
 * NIT 832.004.151-0
 */

// ====== CONFIGURACIÓN ========================================================
const CONFIG = {
  copropiedad: 'Agrupación de Vivienda Portal de Tocancipá P.H.',
  nit: '832.004.151-0',
  tipoAsamblea: 'Asamblea General Extraordinaria',
  fechaAsamblea: 'julio de 2026',
  recolectarCorreo: true,
  permitirAnexos: true,
};

const FORM_ID = '17eL0ziw6VEV5zpZH7QFSf0Wi4aLX8VqN7ARQlnBKoHw';
// =============================================================================

/**
 * Crea el formulario desde cero (ejecutar solo una vez).
 */
function crearFormularioPoder() {
  const form = FormApp.create('Poder de Representación – ' + CONFIG.tipoAsamblea);

  form.setTitle('PODER DE REPRESENTACIÓN\n' + CONFIG.tipoAsamblea);
  form.setDescription(
    CONFIG.copropiedad + ' — NIT ' + CONFIG.nit + '\n\n' +
    'De conformidad con el artículo 37 de la Ley 675 de 2001, el propietario que no pueda ' +
    'asistir personalmente a la ' + CONFIG.tipoAsamblea + ' (' + CONFIG.fechaAsamblea + ') ' +
    'podrá hacerse representar mediante poder escrito. Diligencie la totalidad de los campos. ' +
    'El poder que no se encuentre acompañado de este formulario debidamente diligenciado no ' +
    'podrá ser tenido en cuenta para efectos de quórum ni de votación.'
  );

  if (CONFIG.recolectarCorreo) form.setCollectEmail(true);
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  // --- SECCIÓN 1: DATOS DEL PROPIETARIO (PODERDANTE) ------------------------
  form.addSectionHeaderItem()
    .setTitle('1. Datos del propietario que otorga el poder (poderdante)');

  form.addTextItem()
    .setTitle('Nombre completo del propietario')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Número de cédula del propietario')
    .setHelpText('Documento de identidad del titular inscrito.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Unidad que representa (casa / apartamento / interior)')
    .setHelpText('Indique la nomenclatura exacta de su unidad privada.')
    .setRequired(true);

  const calidad = form.addMultipleChoiceItem();
  calidad.setTitle('Calidad en la que actúa')
    .setChoices([
      calidad.createChoice('Propietario inscrito en el certificado de tradición y libertad'),
      calidad.createChoice('Apoderado general (mediante escritura pública)'),
    ])
    .setRequired(true);

  // --- SECCIÓN 2: DATOS DEL APODERADO ---------------------------------------
  form.addSectionHeaderItem()
    .setTitle('2. Datos de la persona que lo representará (apoderado)');

  form.addTextItem()
    .setTitle('Nombre completo del apoderado')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Número de cédula del apoderado')
    .setRequired(true);

  // --- SECCIÓN 3: CONTACTO --------------------------------------------------
  form.addSectionHeaderItem()
    .setTitle('3. Datos de contacto');

  form.addTextItem()
    .setTitle('Correo electrónico de contacto')
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText('Ingrese un correo electrónico válido.')
        .build()
    );

  form.addTextItem()
    .setTitle('Teléfono de contacto')
    .setRequired(false);

  // --- SECCIÓN 4: ALCANCE, DECLARACIONES Y FIRMA ----------------------------
  form.addSectionHeaderItem()
    .setTitle('4. Alcance del poder, declaraciones y firma');

  const alcance = form.addCheckboxItem();
  alcance.setTitle('Alcance del poder (obligatorio)')
    .setChoices([
      alcance.createChoice(
        'Faculto expresamente al apoderado para deliberar, votar y tomar decisiones en mi ' +
        'nombre sobre todos los puntos del orden del día de la ' + CONFIG.tipoAsamblea + '.'
      ),
    ])
    .setRequired(true);

  const datos = form.addCheckboxItem();
  datos.setTitle('Autorización de tratamiento de datos personales (obligatorio)')
    .setChoices([
      datos.createChoice(
        'Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012, ' +
        'para los fines exclusivos de la organización y desarrollo de la Asamblea.'
      ),
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Firma electrónica: escriba su nombre completo y número de cédula')
    .setHelpText(
      'Al escribir su nombre y cédula manifiesta su voluntad de otorgar el presente poder. ' +
      'Esta declaración equivale a su firma para efectos del registro.'
    )
    .setRequired(true);

  if (CONFIG.permitirAnexos) {
    form.addParagraphTextItem()
      .setTitle('Observaciones (opcional)')
      .setRequired(false);

    try {
      form.addFileUploadItem()
        .setTitle('Anexar poder firmado y/o copia de la cédula (opcional)')
        .setHelpText('Adjunte el documento escaneado o fotografiado si lo tiene disponible.')
        .setRequired(false);
    } catch (e) {
      Logger.log('Carga de archivos no disponible en esta cuenta: ' + e);
    }
  }

  form.setConfirmationMessage(
    '✅ REGISTRO EXITOSO\n\n' +
    'Su poder ha sido registrado correctamente.\n\n' +
    'IMPORTANTE: recuerde que debe remitir este poder firmado en FÍSICO ' +
    'el día de la Asamblea, al momento del registro de asistencia y ' +
    'verificación del quórum. El registro digital no sustituye la entrega ' +
    'del documento físico firmado.\n\n' +
    'Agradecemos su participación.'
  );

  Logger.log('URL edición: ' + form.getEditUrl());
  Logger.log('URL pública: ' + form.getPublishedUrl());
}

/**
 * Vincula el formulario a una Sheet NUEVA para ver las respuestas.
 * Ejecutar cuando se requiera cambiar de hoja de respuestas.
 */
function vincularSheetNuevo() {
  const form = FormApp.openById(FORM_ID);

  form.removeDestination();

  const ss = SpreadsheetApp.create(
    'Respuestas Poder de Representación – ' + CONFIG.tipoAsamblea
  );
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('Sheet nueva creada: ' + ss.getUrl());
  Logger.log('Formulario vinculado correctamente.');
}

/**
 * Elimina el campo de convocatoria del formulario original (primera versión).
 */
function eliminarCampoConvocatoriaV1() {
  const form = FormApp.openById('10X9QcjTdbS9gE1g5ljiosYn6_O_wmIWko1NRASRtRdQ');
  const items = form.getItems();
  for (let i = 0; i < items.length; i++) {
    if (items[i].getTitle().indexOf('Para qué convocatoria otorga el poder') !== -1) {
      form.deleteItem(items[i]);
      Logger.log('Campo de convocatoria eliminado.');
      return;
    }
  }
  Logger.log('No se encontró el campo.');
}

/**
 * Elimina el campo de convocatoria del formulario actual (FORM_ID).
 */
function eliminarCampoConvocatoria() {
  const form = FormApp.openById(FORM_ID);
  const items = form.getItems();
  for (let i = 0; i < items.length; i++) {
    if (items[i].getTitle().indexOf('Para qué convocatoria otorga el poder') !== -1) {
      form.deleteItem(items[i]);
      Logger.log('Campo de convocatoria eliminado.');
      return;
    }
  }
  Logger.log('No se encontró el campo.');
}

/**
 * Ajusta qué campos son obligatorios y cuáles opcionales.
 */
function ajustarObligatorios() {
  const form = FormApp.openById(FORM_ID);
  const opcionales = ['Teléfono de contacto', 'Observaciones'];
  const items = form.getItems();
  for (let i = 0; i < items.length; i++) {
    const titulo = items[i].getTitle();
    const tipo = items[i].getType();
    const esOpcional = opcionales.some(o => titulo.indexOf(o) !== -1);
    try {
      switch (tipo) {
        case FormApp.ItemType.TEXT:
          items[i].asTextItem().setRequired(!esOpcional); break;
        case FormApp.ItemType.PARAGRAPH_TEXT:
          items[i].asParagraphTextItem().setRequired(!esOpcional); break;
        case FormApp.ItemType.MULTIPLE_CHOICE:
          items[i].asMultipleChoiceItem().setRequired(!esOpcional); break;
        case FormApp.ItemType.CHECKBOX:
          items[i].asCheckboxItem().setRequired(!esOpcional); break;
      }
    } catch (e) {
      Logger.log('Sin cambios en: ' + titulo);
    }
  }
  Logger.log('Obligatoriedad ajustada. Opcionales: ' + opcionales.join(', '));
}

/**
 * Actualiza el mensaje de confirmación del formulario.
 */
function actualizarMensajeConfirmacion() {
  const form = FormApp.openById(FORM_ID);
  form.setConfirmationMessage(
    '✅ REGISTRO EXITOSO\n\n' +
    'Su poder ha sido registrado correctamente.\n\n' +
    'IMPORTANTE: recuerde que debe remitir este poder firmado en FÍSICO ' +
    'el día de la Asamblea, al momento del registro de asistencia y ' +
    'verificación del quórum. El registro digital no sustituye la entrega ' +
    'del documento físico firmado.\n\n' +
    'Agradecemos su participación.'
  );
  Logger.log('Mensaje de confirmación actualizado.');
}
