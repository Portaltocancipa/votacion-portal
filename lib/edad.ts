export function calcularEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return 0;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noHaCumplidoAun =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noHaCumplidoAun) edad--;
  return Math.max(edad, 0);
}

export const TIPOS_DOCUMENTO = [
  "Cédula de ciudadanía",
  "Cédula de extranjería",
  "Tarjeta de identidad",
  "Registro civil",
  "Pasaporte",
];

// Documentos típicos de menores de edad: no se les exige correo propio.
export const TIPOS_DOCUMENTO_SIN_CORREO = ["Registro civil", "Tarjeta de identidad"];
