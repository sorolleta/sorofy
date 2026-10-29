import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FeedItem, LiveTrack } from "../types";
import { ripple } from "../ripple";
import { relativeTime } from "../time";

// Minutos:segundos de una posición en milisegundos
export function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// El progreso avanza solo cada segundo entre refrescos de la API, sin
// pasarse de la duración; al acabar la canción avisa para pedir la siguiente
export function useLiveProgress(track: LiveTrack | null | undefined, onEnded?: () => void) {
  const [elapsed, setElapsed] = useState(0);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  useEffect(() => {
    setElapsed(0);
    if (!track?.durationMs) return;
    const timer = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(timer);
  }, [track?.spotifyId, track?.progressMs, track?.durationMs]);
  const position = track?.durationMs ? Math.min((track.progressMs ?? 0) + elapsed, track.durationMs) : 0;
  const ended = Boolean(track?.durationMs) && position >= (track?.durationMs ?? 0);
  useEffect(() => {
    if (ended) endedRef.current?.();
  }, [ended]);
  if (!track?.durationMs) return null;
  return { position, duration: track.durationMs, percent: (position / track.durationMs) * 100 };
}

// Al cambiar de canción, portada y título se apagan 350 ms y vuelven con
// la nueva (como el swapLiveTrack del prototipo) en vez de saltar de golpe
function useSwap(track: LiveTrack) {
  const [shown, setShown] = useState(track);
  const [swapping, setSwapping] = useState(false);
  useEffect(() => {
    if (track.spotifyId === shown.spotifyId && track.track === shown.track) {
      setShown(track);
      return;
    }
    setSwapping(true);
    const timer = setTimeout(() => {
      setShown(track);
      setSwapping(false);
    }, 350);
    return () => clearTimeout(timer);
    // shown solo se compara: no debe relanzar el efecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);
  return { shown, swapping };
}

export function LiveEq({ small, inline }: { small?: boolean; inline?: boolean }) {
  return (
    <span className={`live-eq${small ? " sm" : ""}`} style={inline ? { position: "static" } : undefined} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Face({ item, className }: { item: FeedItem; className: string }) {
  return item.avatarUrl ? (
    <img className={className} src={item.avatarUrl} alt="" />
  ) : (
    <span className={`${className} avatar-placeholder`}>{item.displayName[0]?.toUpperCase()}</span>
  );
}

function Cover({ imageUrl, className }: { imageUrl: string | null; className: string }) {
  return imageUrl ? (
    <img className={className} src={imageUrl} alt="" />
  ) : (
    <span className={`${className} cover-placeholder`}>♪</span>
  );
}

const firstName = (item: FeedItem) => item.displayName.split(" ")[0];

// La canción grande de arriba del feed: quien de tu gente está escuchando
function LiveHero({ item, onNote, onEnded }: { item: FeedItem; onNote: (t: LiveTrack) => void; onEnded: () => void }) {
  const navigate = useNavigate();
  const { shown, swapping } = useSwap(item.nowPlaying!);
  const progress = useLiveProgress(item.nowPlaying, onEnded);
  const name = firstName(item);

  // "Escuchar con…": la misma canción en tu Spotify y el chat con el mensaje
  // ya escrito (lo mandas tú: no se envía nada en tu nombre)
  const listenTogether = () => {
    if (shown.spotifyId) window.open(`https://open.spotify.com/track/${shown.spotifyId}`, "_blank", "noopener");
    navigate(`/chats/${item.userId}`, {
      state: { prefill: `Me uno a lo que escuchas 🎧 ${shown.track} — ${shown.artist}` },
    });
  };

  return (
    <article className="live-card live-hero">
      <Cover imageUrl={shown.imageUrl} className={`live-cover${swapping ? " is-swapping" : ""}`} />
      <div className="live-hero-shade" />
      <div className="live-hero-top">
        <span className="live-badge">
          <span className="live-dot" />
          EN DIRECTO
        </span>
        <LiveEq inline />
      </div>
      <div className="live-hero-body">
        <Link to={`/gente/${item.userId}`} className="live-who">
          <Face item={item} className="live-avatar" />
          <span className="live-name">{name} está escuchando</span>
        </Link>
        <div className="live-track" style={swapping ? { opacity: 0.2 } : undefined}>
          <strong className="live-t">{shown.track}</strong>
          <span className="live-a">{shown.artist}</span>
        </div>
        {progress && (
          <div className="live-hero-prog">
            <div className="live-progress">
              <span className="live-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <span className="live-time">
              {fmtTime(progress.position)} / {fmtTime(progress.duration)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={listenTogether}>
            Escuchar con {name}
          </button>
          {shown.spotifyId && (
            <button
              className="btn btn-quiet btn-sm"
              data-note-track
              onClick={(e) => {
                ripple(e);
                setTimeout(() => onNote(shown), 180);
              }}
            >
              Anotar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// Un anillo de "También suena ahora"
function LiveAva({ item, onEnded }: { item: FeedItem; onEnded: () => void }) {
  const { shown, swapping } = useSwap(item.nowPlaying!);
  useLiveProgress(item.nowPlaying, onEnded);
  return (
    <Link to={`/gente/${item.userId}`} className="live-card live-ava">
      <div className="live-ring">
        <Cover imageUrl={shown.imageUrl} className={`live-cover${swapping ? " is-swapping" : ""}`} />
        <Face item={item} className="live-ava-face" />
      </div>
      <span className="live-name">{firstName(item)}</span>
      <div className="live-track" style={swapping ? { opacity: 0.2 } : undefined}>
        <strong className="live-t">{shown.track}</strong>
        <span className="live-a">{shown.artist}</span>
      </div>
    </Link>
  );
}

const MAX_RINGS = 8;

// Lo de arriba del feed: quien escucha más reciente en grande, el resto en
// anillos (máx. 8) y, al final, la última persona que dejó de escuchar
export default function LiveNow({
  listening,
  onNote,
  onEnded,
}: {
  listening: FeedItem[];
  onNote: (t: LiveTrack) => void;
  onEnded: () => void;
}) {
  const live = listening.filter((i) => i.nowPlaying !== null);
  if (live.length === 0) return null;
  const [hero, ...rest] = live;
  const lastOff = listening.find((i) => i.nowPlaying === null && i.lastPlayed);
  const rings = rest.slice(0, MAX_RINGS);
  if (rings.length === 0 && !lastOff) return <LiveHero item={hero} onNote={onNote} onEnded={onEnded} />;
  return (
    <>
      <LiveHero item={hero} onNote={onNote} onEnded={onEnded} />
      <section className="live-strip">
        <div className="live-head">
          <span className="live-strip-title">También suena ahora</span>
          {rings.length > 0 && <span className="live-count">{rings.length} escuchando</span>}
        </div>
        <div className="live-ava-row">
          {rings.map((item) => (
            <LiveAva key={item.userId} item={item} onEnded={onEnded} />
          ))}
          {lastOff && (
            <Link
              to={`/gente/${lastOff.userId}`}
              className="live-card live-ava is-off"
              title={`${lastOff.lastPlayed!.track} — ${lastOff.lastPlayed!.artist}`}
            >
              <div className="live-ring">
                <Cover imageUrl={lastOff.lastPlayed!.imageUrl} className="live-cover" />
                <Face item={lastOff} className="live-ava-face" />
              </div>
              <span className="live-name">{firstName(lastOff)}</span>
              <div className="live-track">
                <strong className="live-t">{relativeTime(lastOff.lastPlayed!.playedAt)}</strong>
              </div>
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
