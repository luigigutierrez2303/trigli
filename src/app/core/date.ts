/** Fecha local en formato YYYY-MM-DD (sin corrimiento por zona horaria). */
export const toIsoDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
