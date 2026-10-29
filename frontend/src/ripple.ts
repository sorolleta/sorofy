import type { MouseEvent } from "react";

// La onda de pulsación del botón "Anotar"
export function ripple(e: MouseEvent<HTMLElement>) {
  const button = e.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "note-ripple";
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  button.appendChild(span);
  setTimeout(() => span.remove(), 650);
}
