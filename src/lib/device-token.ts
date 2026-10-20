const STORAGE_KEY = 'parkflow.device-id';

/** Identificador anónimo del navegador para limitar reportes. No contiene datos personales. */
export function getDeviceId(): string {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
