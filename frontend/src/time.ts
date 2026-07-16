// Fechas como las cuenta la gente: "hace 2 h", "ayer", "martes"...
// Pasado un mes ya es una fecha normal.
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "ahora mismo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  // Dentro de la semana, el día basta: "martes"
  if (days < 7) return date.toLocaleDateString("es-ES", { weekday: "long" });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;

  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
