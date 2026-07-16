import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { EcoItem } from "../types";
import { relativeTime } from "../time";

const ICON: Record<EcoItem["kind"], string> = {
  liked: "♥",
  commented: "💬",
  discovered: "✓",
  followed: "＋",
  listaSaved: "🗂",
  listaAdded: "🗂",
};

// Los iconos "vivos" (me llega, guardado) llevan el tinte de acento;
// responder, seguir y las estanterías son un susurro más neutro
const ACCENTED: Record<EcoItem["kind"], boolean> = {
  liked: true,
  commented: false,
  discovered: true,
  followed: false,
  listaSaved: false,
  listaAdded: false,
};

// Un eco con los "me llega" de la misma nota agrupados: "A Silvia y a
// 2 personas más les llegó..." en vez de tres filas iguales
interface GroupedEco {
  eco: EcoItem;
  moreActors: number;
}

function groupLikes(ecos: EcoItem[]): GroupedEco[] {
  const grouped: GroupedEco[] = [];
  const likesByNote = new Map<string, GroupedEco>();
  for (const eco of ecos) {
    if (eco.kind !== "liked" || !eco.noteId) {
      grouped.push({ eco, moreActors: 0 });
      continue;
    }
    const existing = likesByNote.get(eco.noteId);
    if (existing) {
      // La lista llega ordenada por fecha: el primero es el más reciente
      existing.moreActors += 1;
      existing.eco = { ...existing.eco, hasUnread: existing.eco.hasUnread || eco.hasUnread };
    } else {
      const entry = { eco, moreActors: 0 };
      likesByNote.set(eco.noteId, entry);
      grouped.push(entry);
    }
  }
  return grouped;
}

function ecoBody({ eco, moreActors }: GroupedEco) {
  const actor = <em>{eco.actor.name}</em>;
  switch (eco.kind) {
    case "liked": {
      const others =
        moreActors === 0 ? null : moreActors === 1 ? (
          <> y a <em>otra persona</em></>
        ) : (
          <> y a <em>{moreActors} personas más</em></>
        );
      return (
        <>
          A {actor}{others} {moreActors > 0 ? "les" : "le"} llegó tu nota sobre{" "}
          <strong>{eco.musicItemName}</strong>.
        </>
      );
    }
    case "commented":
      return (
        <>
          {actor} respondió en tu nota sobre <strong>{eco.musicItemName}</strong>
          {eco.quote && <>: <span className="eco-quote">«{eco.quote}»</span></>}
        </>
      );
    case "discovered":
      return <>{actor} guardó <strong>{eco.musicItemName}</strong> gracias a tu nota.</>;
    case "followed":
      return (
        <>
          {actor} empezó a seguirte.
          {eco.commonArtist && <> Tenéis a <strong>{eco.commonArtist}</strong> en común.</>}
        </>
      );
    case "listaSaved":
      return <>{actor} guardó tu estantería <strong>«{eco.listaTitle}»</strong>.</>;
    case "listaAdded":
      return (
        <>
          {actor} propuso <strong>{eco.musicItemName}</strong> en tu estantería{" "}
          <strong>«{eco.listaTitle}»</strong>.
        </>
      );
  }
}

// A dónde lleva pulsar el eco: a la nota si la hay, a la estantería si es
// suya, y si no al perfil de quien actuó
function ecoTarget(eco: EcoItem): string {
  if (eco.noteId) return `/nota/${eco.noteId}`;
  if (eco.listaId) return `/listas/${eco.listaId}`;
  return `/gente/${eco.actor.id}`;
}

function ecoGroup(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return "Hoy";
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date >= weekAgo) return "Esta semana";
  return "Antes";
}

export default function Ecos() {
  const [ecos, setEcos] = useState<EcoItem[] | null>(null);

  useEffect(() => {
    api.get<EcoItem[]>("/api/ecos").then(setEcos);
    // Abrir la pantalla es leerla: limpia el punto de la campana
    api.post("/api/ecos/read").catch(() => {});
  }, []);

  if (!ecos) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div className="app-col" style={{ maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingTop: 8 }}>
        <h2 className="section-title">Ecos</h2>
        <span className="note-track-date">lo que tus notas han movido</span>
      </div>
      <p className="section-sub" style={{ marginTop: 4 }}>
        Sin cifras, sin "a X personas les gusta". Solo el rastro de lo que dejaste en tu gente.
      </p>

      {ecos.length === 0 ? (
        <p className="empty-state" style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
          Aquí solo suenan los ecos de tu gente. Nada de rankings ni contadores.
        </p>
      ) : (
        groupLikes(ecos).map((grouped) => {
          const { eco } = grouped;
          const group = ecoGroup(eco.createdAt);
          const showGroup = group !== lastGroup;
          lastGroup = group;
          return (
            <div key={eco.id}>
              {showGroup && <div className="eco-group-title">{group}</div>}
              <Link
                to={ecoTarget(eco)}
                className={`eco-row${eco.hasUnread ? " eco-unread" : ""}`}
              >
                <span
                  className="eco-icon"
                  style={
                    ACCENTED[eco.kind]
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { background: "var(--surface-2)" }
                  }
                >
                  {ICON[eco.kind]}
                </span>
                <span className="eco-body">
                  {ecoBody(grouped)}
                  <div className="eco-time">{relativeTime(eco.createdAt)}</div>
                </span>
                {eco.musicItemImageUrl && (
                  <img className="eco-cover" src={eco.musicItemImageUrl} alt="" />
                )}
              </Link>
            </div>
          );
        })
      )}
    </div>
  );
}
