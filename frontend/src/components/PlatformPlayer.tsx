import { useState } from "react";

// De un enlace de YouTube al del player embebido (dominio sin cookies)
export function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function soundcloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%231db954`;
}

// El embed oficial de Spotify: 30 segundos para cualquiera, la canción
// entera si tienes sesión de Spotify en el navegador. No usa la API
// (los preview_url de 30s fueron retirados en nov. 2024).
export function spotifyEmbedUrl(type: string, spotifyId: string): string | null {
  if (type !== "track" && type !== "album" && type !== "artist") return null;
  return `https://open.spotify.com/embed/${type}/${spotifyId}`;
}

interface Props {
  youtubeUrl: string | null;
  soundcloudUrl: string | null;
  spotifyType?: string;
  spotifyId?: string | null;
  title: string;
}

// Botones de plataforma + player embebido, juntos: lo usa la cabecera de
// la ficha de un item (la tarjeta de nota tiene su propia maquetación)
export default function PlatformPlayer({ youtubeUrl, soundcloudUrl, spotifyType, spotifyId, title }: Props) {
  const [playing, setPlaying] = useState<"youtube" | "soundcloud" | "spotify" | null>(null);
  const youtubeEmbed = youtubeUrl ? youtubeEmbedUrl(youtubeUrl) : null;
  const spotifyEmbed = spotifyType && spotifyId ? spotifyEmbedUrl(spotifyType, spotifyId) : null;

  if (!youtubeEmbed && !soundcloudUrl && !spotifyEmbed) return null;

  return (
    <>
      <p className="platform-actions">
        {spotifyEmbed && (
          <button
            type="button"
            className="btn-platform"
            onClick={() => setPlaying(playing === "spotify" ? null : "spotify")}
          >
            {playing === "spotify" ? "✕ Cerrar" : "▶ Escuchar"}
          </button>
        )}
        {youtubeEmbed && (
          <button
            type="button"
            className="btn-platform"
            onClick={() => setPlaying(playing === "youtube" ? null : "youtube")}
          >
            {playing === "youtube" ? "✕ Cerrar vídeo" : "▶ Ver en YouTube"}
          </button>
        )}
        {soundcloudUrl && (
          <button
            type="button"
            className="btn-platform"
            onClick={() => setPlaying(playing === "soundcloud" ? null : "soundcloud")}
          >
            {playing === "soundcloud" ? "✕ Cerrar audio" : "▶ Escuchar en SoundCloud"}
          </button>
        )}
      </p>
      {playing === "spotify" && spotifyEmbed && (
        <div className={`embed-wrap ${spotifyType === "track" ? "spotify" : "spotify-full"}`}>
          <iframe src={spotifyEmbed} title={`Spotify: ${title}`} allow="encrypted-media" />
        </div>
      )}
      {playing === "youtube" && youtubeEmbed && (
        <div className="embed-wrap video">
          <iframe
            src={youtubeEmbed}
            title={`Vídeo de ${title}`}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {playing === "soundcloud" && soundcloudUrl && (
        <div className="embed-wrap audio">
          <iframe src={soundcloudEmbedUrl(soundcloudUrl)} title={`Audio de ${title}`} allow="encrypted-media" />
        </div>
      )}
    </>
  );
}
