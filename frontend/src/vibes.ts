// Los 6 vibes del diseño "Salvia": color + tinta con contraste AA.
// La BD guarda el hex del vibe tal cual, así que aquí vive la paleta
// ejecutable (los tokens --vibe-* de index.css la documentan).

export type Vibe = { hex: string; ink: string };

export const VIBES: Vibe[] = [
  { hex: "#f5a623", ink: "#3a2a08" }, // naranja
  { hex: "#6fa8ff", ink: "#0d1e3d" }, // azul
  { hex: "#d98fe0", ink: "#331039" }, // lila
  { hex: "#ff8a70", ink: "#3d150b" }, // coral
  { hex: "#7fd482", ink: "#103417" }, // verde
  { hex: "#efd35d", ink: "#3a3208" }, // amarillo
];

// Las notas antiguas guardaron la paleta anterior; cada color viejo
// se muestra como su vibe nuevo más parecido (la BD no se toca).
const LEGACY: Record<string, string> = {
  "#e63946": "#ff8a70", // rojo -> coral
  "#f4a261": "#f5a623", // naranja -> naranja
  "#e9c46a": "#efd35d", // amarillo -> amarillo
  "#2a9d8f": "#7fd482", // teal -> verde
  "#457b9d": "#6fa8ff", // azul -> azul
  "#8338ec": "#d98fe0", // morado -> lila
};

export function resolveVibe(stored: string): Vibe {
  const hex = LEGACY[stored.toLowerCase()] ?? stored;
  const vibe = VIBES.find((v) => v.hex === hex);
  // Un hex desconocido se pinta tal cual, con tinta oscura legible
  return vibe ?? { hex: stored, ink: "#121212" };
}
