import { useState } from "react";

// De un enlace de YouTube al del player embebido (dominio sin cookies)
export function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([\w-]{6,})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function soundcloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%231db954`;
}

interface Props {
  youtubeUrl: string | null;
  soundcloudUrl: string | null;
  title: string;
}

// Botones de plataforma + player embebido, juntos: lo usa la cabecera de
// la ficha de un item (la tarjeta de nota tiene su propia maquetación)
export default function PlatformPlayer({ youtubeUrl, soundcloudUrl, title }: Props) {
  const [playing, setPlaying] = useState<"youtube" | "soundcloud" | null>(null);
  const youtubeEmbed = youtubeUrl ? youtubeEmbedUrl(youtubeUrl) : null;

  if (!youtubeEmbed && !soundcloudUrl) return null;

  return (
    <>
      <p className="platform-actions">
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
