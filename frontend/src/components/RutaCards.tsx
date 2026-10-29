import { Link } from "react-router-dom";
import type { RutaCard as Card } from "../types";

// Portada de una parada: la imagen de Spotify o, si no hay, el degradado
export function RutaArt({ url, className = "" }: { url: string | null | undefined; className?: string }) {
  return url ? <img className={`rt-art ${className}`} src={url} alt="" /> : <span className={`rt-art ${className}`} />;
}

export function AuthorAvatar({ name, url, size }: { name: string; url: string | null; size?: number }) {
  const style = size ? { width: size, height: size } : undefined;
  return url ? (
    <img className="note-avatar" style={style} src={url} alt="" />
  ) : (
    <span className="note-avatar avatar-placeholder" style={style}>
      {name[0]?.toUpperCase()}
    </span>
  );
}

// La cita corta de la parada de inicio («Empieza por "granada": …»)
export function startQuote(card: Card, max = 70) {
  const s = card.start;
  if (!s) return null;
  const text = s.leadText ? `Empieza por «${s.title}»: ${s.leadText.charAt(0).toLowerCase()}${s.leadText.slice(1)}` : `Empieza por «${s.title}».`;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const firstName = (name: string) => name.split(" ")[0];

// Tarjeta pequeña (Listas, ficha de artista): mosaico de 4 portadas
export function RutaCardSmall({ card, sub }: { card: Card; sub?: string }) {
  const covers = [...card.strip, null, null, null, null].slice(0, 4);
  return (
    <Link to={`/rutas/${card.id}`} className="ruta-card">
      <div className="ruta-mosaic">
        {covers.map((c, i) => (
          <RutaArt key={i} url={c?.imageUrl} />
        ))}
      </div>
      <div className="ruta-card-body">
        <span className="ruta-card-title">{card.title}</span>
        <span className="lista-curator">
          <AuthorAvatar name={card.author.displayName} url={card.author.avatarUrl} />
          de {card.author.displayName} · {card.nodeCount} {card.nodeCount === 1 ? "disco" : "discos"}
          {sub ?? (card.start ? ` · empieza por «${card.start.title}»` : "")}
        </span>
      </div>
    </Link>
  );
}

// La tarjeta de la columna derecha del Feed («Por dónde empezar»)
export function SideRuta({ card }: { card: Card }) {
  const [first, second, third] = card.strip;
  return (
    <section className="side-ruta">
      <Link to={`/rutas/${card.id}`} style={{ display: "contents", color: "inherit" }}>
        <span className="ruta-kicker">POR DÓNDE EMPEZAR</span>
        <strong className="side-ruta-title">{card.title}</strong>
        <span className="lista-curator">
          <AuthorAvatar name={card.author.displayName} url={card.author.avatarUrl} />
          de {firstName(card.author.displayName)} · {card.nodeCount} discos
        </span>
        <div className="side-ruta-strip">
          <div className="side-ruta-start">
            <RutaArt url={first?.imageUrl} />
            <span className="side-ruta-badge">EMPIEZA AQUÍ</span>
          </div>
          {second && <span className="side-ruta-arrow">→</span>}
          {second && <RutaArt url={second.imageUrl} />}
          {third && <span className="side-ruta-arrow">→</span>}
          {third && <RutaArt url={third.imageUrl} />}
        </div>
        {startQuote(card, 60) && <p className="side-ruta-quote">«{startQuote(card, 60)}»</p>}
      </Link>
      <Link className="btn btn-primary btn-sm side-ruta-cta" to={`/rutas/${card.id}?vista=orden`}>
        Seguir la ruta
      </Link>
      <Link className="side-ruta-more" to="/listas">
        Más rutas de tu gente →
      </Link>
    </section>
  );
}

// La ruta destacada grande de Listas
export function PdeHero({ card }: { card: Card }) {
  const [first, second, third] = card.strip;
  const more = card.nodeCount - Math.min(card.strip.length, 3);
  return (
    <article className="pde-hero">
      <Link to={`/rutas/${card.id}`} className="pde-hero-strip" style={{ color: "inherit" }}>
        <div className="pde-hero-start">
          <RutaArt url={first?.imageUrl} />
          <span className="ruta-start" style={{ right: 8 }}>
            EMPIEZA AQUÍ
          </span>
        </div>
        {second && <span className="pde-arrow">→</span>}
        {second && <RutaArt url={second.imageUrl} />}
        {third && <span className="pde-arrow">→</span>}
        {third && <RutaArt url={third.imageUrl} />}
        {more > 0 && <span className="pde-more">+{more}</span>}
      </Link>
      <div className="pde-hero-body">
        <span className="lista-curator">
          <AuthorAvatar name={card.author.displayName} url={card.author.avatarUrl} />
          de {card.author.displayName} · {card.nodeCount} discos en {card.branchCount} {card.branchCount === 1 ? "rama" : "ramas"}
        </span>
        <Link to={`/rutas/${card.id}`} className="pde-hero-title" style={{ color: "#fff" }}>
          {card.title}
        </Link>
        {card.start && (
          <p className="pde-hero-quote">
            «{startQuote(card, 200)}
            {card.start.why ? ` ${card.start.why}` : ""}»
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" to={`/rutas/${card.id}?vista=orden`}>
            Seguir la ruta
          </Link>
          <Link className="btn btn-quiet btn-sm" to={`/rutas/${card.id}`}>
            Ver el mapa
          </Link>
        </div>
      </div>
    </article>
  );
}

// Una ruta compartida en un chat
export function RutaBubble({ card, mine }: { card: Card; mine: boolean }) {
  // La burbuja se alinea como un mensaje: a la derecha si lo mandaste tú
  return (
    <Link to={`/rutas/${card.id}`} className="bubble-ruta" style={mine ? { alignSelf: "flex-end" } : undefined}>
      <RutaArt url={card.strip[0]?.imageUrl} />
      <div className="bubble-ruta-info">
        <span>{card.isMine ? "Te paso mi ruta" : `Ruta de ${firstName(card.author.displayName)}`}</span>
        <strong>{card.title}</strong>
      </div>
      <span className="bubble-ruta-go">→</span>
    </Link>
  );
}
