// Locations for Guatemala (zones, municipios, departamentos)

export const ZONAS_CIUDAD = Array.from({ length: 25 }, (_, i) => `Zona ${i + 1}`);

export const MUNICIPIOS_FRECUENTES = [
  "San José Pinula",
  "Santa Catarina Pinula",
  "Fraijanes",
  "San Lucas Sacatepéquez",
  "La Antigua Guatemala",
  "Puerto Barrios",
  "Panajachel / Atitlán",
  "Cayalá",
];

export const DEPARTAMENTOS = [
  "Guatemala",
  "Alta Verapaz",
  "Baja Verapaz",
  "Chimaltenango",
  "Chiquimula",
  "El Progreso",
  "Escuintla",
  "Huehuetenango",
  "Izabal",
  "Jalapa",
  "Jutiapa",
  "Petén",
  "Quetzaltenango",
  "Quiché",
  "Retalhuleu",
  "Sacatepéquez",
  "San Marcos",
  "Santa Rosa",
  "Sololá",
  "Suchitepéquez",
  "Totonicapán",
  "Zacapa",
];

export const UBICACIONES_PREDEFINIDAS = [
  ...ZONAS_CIUDAD,
  ...MUNICIPIOS_FRECUENTES,
];
