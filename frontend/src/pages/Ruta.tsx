import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, getMe, isGuest } from "../api";
import type { RutaBranch, RutaDetail, RutaNode, SearchResponse, UserSummary } from "../types";
import { AuthorAvatar, RutaArt } from "../components/RutaCards";
import { ripple } from "../ripple";

type View = "map" | "list" | "edit";

// Lo que se edita: la ruta entera, que se guarda de una vez
interface Draft {
  title: string;
  intro: string;
  artistName: string;
  artistSpotifyId: string | null;
  branches: RutaBranch[];
}

// Qué está seleccionado en el panel de la derecha
type Sel = { kind: "node"; id: string } | { kind: "branch"; index: number } | { kind: "add"; branch: number } | { kind: "share" };

const newId = () => Math.random().toString(36).slice(2, 12);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const EMPTY_BRANCHES: RutaBranch[] = [{ label: "Empieza por aquí", bridgeLead: null, bridge: null, nodes: [] }];

function flatten(branches: RutaBranch[]) {
  return branches.flatMap((b, bi) => b.nodes.map((n) => ({ ...n, branch: b.label, branchIndex: bi })));
}

export default function Ruta() {
  const { id } = useParams();
  const isNew = !id || id === "nueva";
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<RutaDetail | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(isNew ? "edit" : params.get("vista") === "orden" ? "list" : "map");
  const [sel, setSel] = useState<Sel | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    getMe().then((me) => setGuest(isGuest(me.spotifyId))).catch(() => {});
  }, []);

  // Cargar la ruta (o preparar una nueva, quizá respondiendo a una petición)
  useEffect(() => {
    setError("");
    if (isNew) {
      const artist = params.get("artista") ?? "";
      setDetail(null);
      setDraft({
        title: artist ? `Cómo entrar en ${artist}` : "",
        intro: "",
        artistName: artist,
        artistSpotifyId: params.get("spotifyId"),
        branches: clone(EMPTY_BRANCHES),
      });
      setSel({ kind: "add", branch: 0 });
      return;
    }
    api
      .get<RutaDetail>(`/api/rutas/${id}`)
      .then((d) => {
        setDetail(d);
        setDone(new Set(d.done));
        setSaved(d.isSaved);
        setSel(null);
        if (params.get("vista") === "editar" && d.card.isMine) startEdit(d);
      })
      .catch(() => setError("Esta ruta no existe o no se pudo cargar"));
    // startEdit solo usa el detalle recién cargado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const startEdit = (d: RutaDetail) => {
    setDraft({
      title: d.card.title,
      intro: d.card.intro ?? "",
      artistName: d.card.artistName,
      artistSpotifyId: d.artistSpotifyId,
      branches: clone(d.branches),
    });
    setView("edit");
  };

  const editing = view === "edit" && draft !== null;
  const branches = editing ? draft!.branches : detail?.branches ?? [];
  const flat = useMemo(() => flatten(branches), [branches]);
  const startNode = flat.find((n) => n.isStart) ?? flat[0];
  const selNodeId = sel?.kind === "node" ? sel.id : !editing ? startNode?.id : undefined;
  const selIndex = flat.findIndex((n) => n.id === selNodeId);
  const S = selIndex >= 0 ? flat[selIndex] : undefined;
  const authorName = detail?.card.author.displayName ?? "ti";

  // ---------- acciones de lectura ----------
  const toggleDone = async (nodeId: string) => {
    if (!detail) return;
    const next = new Set(done);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    setDone(next);
    await api.post(`/api/rutas/${detail.card.id}/done/${nodeId}`).catch(() => {});
  };

  const toggleSave = async () => {
    if (!detail) return;
    if (saved) await api.delete(`/api/rutas/${detail.card.id}/save`);
    else await api.post(`/api/rutas/${detail.card.id}/save`);
    setSaved(!saved);
  };

  // «Hacer la mía»: si es tuya se edita; si no, se copia como tuya y se edita
  const makeMine = async () => {
    if (!detail) return;
    if (detail.card.isMine) {
      startEdit(detail);
      return;
    }
    const copy = await api.post<{ id: string }>(`/api/rutas/${detail.card.id}/fork`);
    navigate(`/rutas/${copy.id}?vista=editar`);
  };

  const step = (delta: number) => {
    if (flat.length === 0) return;
    const i = selIndex < 0 ? 0 : selIndex;
    setSel({ kind: "node", id: flat[(i + delta + flat.length) % flat.length].id });
  };

  // «Anotar»: abre Notas con el disco ya elegido
  const noteNode = (n: RutaNode) => {
    if (!n.spotifyId) return;
    navigate("/notas", {
      state: { noteDraft: { itemType: n.itemType, spotifyItemId: n.spotifyId, name: n.title, artistName: n.artist, imageUrl: n.imageUrl } },
    });
  };

  // ---------- acciones del editor ----------
  const patch = (fn: (d: Draft) => void) => {
    if (!draft) return;
    const next = clone(draft);
    fn(next);
    setDraft(next);
  };
  const patchNode = (nodeId: string, fn: (n: RutaNode, list: RutaNode[], i: number) => void) =>
    patch((d) => {
      for (const b of d.branches) {
        const i = b.nodes.findIndex((n) => n.id === nodeId);
        if (i >= 0) fn(b.nodes[i], b.nodes, i);
      }
    });

  const addNode = (branchIndex: number, pick: { type: "album" | "track"; id: string; name: string; artistName: string; imageUrl: string | null }) => {
    const node: RutaNode = {
      id: newId(),
      spotifyId: pick.id,
      itemType: pick.type,
      title: pick.name,
      artist: pick.artistName,
      year: null,
      imageUrl: pick.imageUrl,
      isStart: flat.length === 0,
      lead: flat.length === 0 ? "Empieza aquí." : null,
      leadText: null,
      edgeLead: null,
      edge: null,
      why: null,
    };
    patch((d) => d.branches[branchIndex].nodes.push(node));
    setSel({ kind: "node", id: node.id });
  };

  const addBranch = () => {
    patch((d) => d.branches.push({ label: "Nueva rama", bridgeLead: null, bridge: null, nodes: [] }));
    setSel({ kind: "branch", index: draft!.branches.length });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const body = { ...draft, answersRequestId: params.get("peticion") };
      if (isNew) {
        const created = await api.post<{ id: string }>("/api/rutas", body);
        navigate(`/rutas/${created.id}`, { replace: true });
      } else {
        await api.put(`/api/rutas/${detail!.card.id}`, body);
        const d = await api.get<RutaDetail>(`/api/rutas/${detail!.card.id}`);
        setDetail(d);
        setDraft(null);
        setView("map");
        setSel(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la ruta");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (isNew) {
      navigate("/listas");
      return;
    }
    setDraft(null);
    setView("map");
    setSel(null);
  };

  const deleteRuta = async () => {
    if (!detail || !window.confirm("¿Borrar esta ruta? No se puede deshacer.")) return;
    await api.delete(`/api/rutas/${detail.card.id}`);
    navigate("/listas", { replace: true });
  };

  if (error && !detail && !draft) return <p className="error">{error}</p>;
  if (!detail && !draft) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando la ruta…
      </div>
    );
  }

  const nDone = flat.filter((n) => done.has(n.id)).length;
  const kicker = editing
    ? isNew
      ? "NUEVA RUTA DE ESCUCHA"
      : detail?.forkedFrom
        ? `EDITANDO · TU VERSIÓN A PARTIR DE LA RUTA DE ${detail.forkedFrom.authorName.toUpperCase()}`
        : "EDITANDO TU RUTA"
    : `RUTA DE ESCUCHA · DE ${authorName.toUpperCase()}`;

  return (
    <div className="ruta-wrap">
      <Link className="back-link" to="/listas">
        ← Listas y rutas
      </Link>

      <header className="ruta-head">
        <div className="ruta-head-l">
          <span className="ruta-kicker">{kicker}</span>
          {editing ? (
            <>
              <input
                className="ruta-title-input"
                placeholder="Cómo entrar en…"
                maxLength={120}
                value={draft!.title}
                onChange={(e) => patch((d) => (d.title = e.target.value))}
              />
              <div className="rt-edit-field" style={{ maxWidth: 520, width: "100%" }}>
                <label>Artista de la ruta</label>
                <input
                  placeholder="Ej. Sílvia Pérez Cruz"
                  maxLength={200}
                  value={draft!.artistName}
                  onChange={(e) => patch((d) => (d.artistName = e.target.value))}
                />
              </div>
              <textarea
                className="ruta-intro-input"
                placeholder="Cuenta en dos frases cómo se recorre: cuántos discos, por dónde se empieza…"
                maxLength={600}
                value={draft!.intro}
                onChange={(e) => patch((d) => (d.intro = e.target.value))}
              />
              <div className="ruta-ctas">
                <button className="btn btn-primary" onClick={saveDraft} disabled={saving}>
                  {saving ? "Guardando…" : isNew ? "Crear ruta" : "Guardar ruta"}
                </button>
                <button className="btn btn-quiet" onClick={cancelEdit}>
                  Cancelar
                </button>
                {!isNew && (
                  <button className="btn btn-quiet" onClick={deleteRuta}>
                    Borrar ruta
                  </button>
                )}
              </div>
              {error && <p className="error">{error}</p>}
            </>
          ) : (
            <>
              <h1 className="ruta-title">{detail!.card.title}</h1>
              {detail!.card.intro && <p className="ruta-intro">{detail!.card.intro}</p>}
              <div className="ruta-ctas">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setView("list");
                    setSel(null);
                  }}
                >
                  Seguir la ruta
                </button>
                <button className={`btn btn-quiet btn-save${saved ? " is-saved" : ""}`} onClick={toggleSave}>
                  {saved ? "✓ Guardada" : "Guardar"}
                </button>
                <button className="btn btn-quiet" onClick={makeMine}>
                  {detail!.card.isMine ? "Editar la mía" : "Hacer la mía"}
                </button>
                <button className="btn btn-quiet" onClick={() => setSel({ kind: "share" })}>
                  Compartir
                </button>
              </div>
            </>
          )}
        </div>
        <div className="ruta-head-r">
          {detail && (
            <Link to={`/gente/${detail.card.author.id}`} className="ruta-by" style={{ color: "inherit" }}>
              <AuthorAvatar name={detail.card.author.displayName} url={detail.card.author.avatarUrl} size={34} />
              <div>
                <strong>{detail.card.author.displayName}</strong>
                <span>
                  {detail.card.author.province ?? "Sorofy"} · sobre {detail.card.artistName}
                </span>
              </div>
            </Link>
          )}
          <div className="ruta-seg">
            {!isNew && (
              <>
                <button className={view === "map" ? "is-on" : ""} onClick={() => (editing ? cancelEdit() : setView("map"))}>
                  Mapa
                </button>
                <button
                  className={view === "list" ? "is-on" : ""}
                  onClick={() => {
                    if (editing) cancelEdit();
                    setView("list");
                  }}
                >
                  En orden
                </button>
              </>
            )}
            <button className={view === "edit" ? "is-on" : ""} onClick={() => (editing ? undefined : makeMine())}>
              Editar
            </button>
          </div>
          {!editing && (
            <span className="ruta-progress">
              {nDone ? `${nDone} de ${flat.length} escuchados · solo lo ves tú` : "Tu progreso es privado"}
            </span>
          )}
        </div>
      </header>

      <div className="ruta-body">
        {view === "list" && !editing ? (
          <div className="ruta-list">
            {flat.map((n, i) => (
              <div
                key={n.id}
                className={`ruta-li${n.id === selNodeId ? " is-sel" : ""}`}
                onClick={() => setSel({ kind: "node", id: n.id })}
              >
                <span className="ruta-li-n">{String(i + 1).padStart(2, "0")}</span>
                <div className="ruta-li-cover">
                  <RutaArt url={n.imageUrl} />
                </div>
                <div className="ruta-li-info">
                  <div className="ruta-node-h">
                    <strong>{n.title}</strong>
                    {n.year && <span className="ruta-year">{n.year}</span>}
                  </div>
                  <span className="ruta-li-sub">
                    {n.artist} · {n.branch}
                  </span>
                  {n.why && <span className="ruta-li-why">{n.why}</span>}
                </div>
                <button
                  className={`ruta-li-chk${done.has(n.id) ? " is-done" : ""}`}
                  aria-label="Marcar como escuchado"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDone(n.id);
                  }}
                >
                  {done.has(n.id) ? "✓" : ""}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`ruta-board${editing ? " is-edit" : ""}`}>
            <div className="ruta-board-in">
              {branches.map((b, bi) => (
                <div key={bi} className="ruta-branch">
                  <div className="ruta-branch-label">
                    {editing ? (
                      <button onClick={() => setSel({ kind: "branch", index: bi })} title="Editar la rama">
                        <span>{b.label}</span>
                      </button>
                    ) : (
                      <span>{b.label}</span>
                    )}
                  </div>
                  <div>
                    <div className="ruta-row">
                      {b.nodes.map((n, i) => (
                        <Fragment key={n.id}>
                          <div
                            className={`ruta-node${n.isStart ? " is-start" : ""}${n.id === selNodeId ? " is-sel" : ""}`}
                            onClick={() => setSel({ kind: "node", id: n.id })}
                          >
                            <div className="ruta-node-h">
                              <strong>{n.title}</strong>
                              {n.year && <span className="ruta-year">{n.year}</span>}
                            </div>
                            <span className="ruta-artist">{n.artist}</span>
                            <div className="ruta-cover">
                              <RutaArt url={n.imageUrl} />
                              {n.isStart && <span className="ruta-start">EMPIEZA AQUÍ</span>}
                              {done.has(n.id) && <span className="ruta-check">✓</span>}
                            </div>
                            {n.isStart && (n.lead || n.leadText) && (
                              <p className="ruta-lead">
                                <b>{n.lead}</b> {n.leadText}
                              </p>
                            )}
                          </div>
                          {i < b.nodes.length - 1 && (
                            <div className="ruta-edge">
                              <div className="ruta-arrow">
                                <i />
                                <b />
                                <i />
                              </div>
                              {(n.edgeLead || n.edge) && (
                                <p>
                                  <b>{n.edgeLead}</b> {n.edge}
                                </p>
                              )}
                            </div>
                          )}
                        </Fragment>
                      ))}
                      <div className="ruta-add" onClick={() => setSel({ kind: "add", branch: bi })}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 400 }}>+</span>Añadir disco
                      </div>
                    </div>
                    {(b.bridge || b.bridgeLead) && bi < branches.length - 1 && (
                      <div className="ruta-bridge">
                        <div className="ruta-varrow">
                          <i />
                          <b />
                          <i />
                        </div>
                        <p>
                          <b>{b.bridgeLead}</b> {b.bridge}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="ruta-add-branch" onClick={addBranch}>
                <span style={{ fontSize: "1.25rem", fontWeight: 400, color: "#c9bfff" }}>+</span>Nueva rama{" "}
                <span>· p. ej. «En directo» o «Lo que versiona»</span>
              </div>
            </div>
          </div>
        )}

        <article className="ruta-aside">
          {sel?.kind === "share" && detail ? (
            <SharePanel rutaId={detail.card.id} title={detail.card.title} onClose={() => setSel(null)} />
          ) : editing && sel?.kind === "add" ? (
            <AddNodePanel
              branchLabel={draft!.branches[sel.branch]?.label ?? ""}
              artistHint={draft!.artistName}
              onPick={(p) => addNode(sel.branch, p)}
            />
          ) : editing && sel?.kind === "branch" && draft!.branches[sel.index] ? (
            <BranchPanel
              branch={draft!.branches[sel.index]}
              isLast={sel.index === draft!.branches.length - 1}
              canDelete={draft!.branches.length > 1}
              onChange={(fn) => patch((d) => fn(d.branches[sel.index]))}
              onDelete={() => {
                patch((d) => d.branches.splice(sel.index, 1));
                setSel(null);
              }}
            />
          ) : S ? (
            editing ? (
              <NodeEditPanel
                node={S}
                position={`PARADA ${selIndex + 1} DE ${flat.length} · ${S.branch.toUpperCase()}`}
                isLastInBranch={draft!.branches[S.branchIndex].nodes.at(-1)?.id === S.id}
                onChange={(fn) => patchNode(S.id, (n) => fn(n))}
                onMakeStart={() =>
                  patch((d) => d.branches.forEach((b) => b.nodes.forEach((n) => (n.isStart = n.id === S.id))))
                }
                onMove={(delta) =>
                  patchNode(S.id, (_n, list, i) => {
                    const j = i + delta;
                    if (j < 0 || j >= list.length) return;
                    [list[i], list[j]] = [list[j], list[i]];
                  })
                }
                onRemove={() => {
                  patchNode(S.id, (_n, list, i) => list.splice(i, 1));
                  setSel(null);
                }}
              />
            ) : (
              <>
                <span className="ruta-kicker">
                  PARADA {selIndex + 1} DE {flat.length} · {S.branch.toUpperCase()}
                </span>
                <div className="ruta-a-cover">
                  <RutaArt url={S.imageUrl} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong className="ruta-a-title">{S.title}</strong>
                  <span className="ruta-a-sub">
                    {S.artist}
                    {S.year ? ` · ${S.year}` : ""}
                  </span>
                </div>
                {S.why && (
                  <div className="ruta-a-why">
                    <span>POR QUÉ ESTÁ AQUÍ · {authorName.toUpperCase()}</span>
                    <p>{S.why}</p>
                  </div>
                )}
                <div className="ruta-a-ctas">
                  <button className="btn btn-primary btn-sm" onClick={() => toggleDone(S.id)}>
                    {done.has(S.id) ? "Escuchado ✓" : "Marcar como escuchado"}
                  </button>
                  {S.spotifyId && !guest && (
                    <button
                      className="btn btn-quiet btn-sm"
                      data-note-track
                      onClick={(e) => {
                        ripple(e);
                        setTimeout(() => noteNode(S), 180);
                      }}
                    >
                      Anotar
                    </button>
                  )}
                  {S.spotifyId && (
                    <a
                      className="btn btn-quiet btn-sm"
                      href={`https://open.spotify.com/${S.itemType}/${S.spotifyId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Escuchar
                    </a>
                  )}
                </div>
                <div className="ruta-a-step">
                  <button onClick={() => step(-1)}>← Anterior</button>
                  <button onClick={() => step(1)}>Siguiente →</button>
                </div>
              </>
            )
          ) : (
            <p className="section-sub">
              {editing ? "Pulsa «+ Añadir disco» en una rama para empezar tu ruta." : "Esta ruta aún no tiene discos."}
            </p>
          )}
        </article>
      </div>
    </div>
  );
}

// ---------- paneles del editor ----------

function Field({ label, value, onChange, multiline, max, placeholder }: {
  label: string; value: string | null; onChange: (v: string) => void; multiline?: boolean; max: number; placeholder?: string;
}) {
  return (
    <div className="rt-edit-field">
      <label>{label}</label>
      {multiline ? (
        <textarea maxLength={max} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input maxLength={max} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function NodeEditPanel({ node, position, isLastInBranch, onChange, onMakeStart, onMove, onRemove }: {
  node: RutaNode;
  position: string;
  isLastInBranch: boolean;
  onChange: (fn: (n: RutaNode) => void) => void;
  onMakeStart: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <span className="ruta-kicker">{position}</span>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flex: "none" }}>
          <RutaArt url={node.imageUrl} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <strong className="ruta-a-title" style={{ fontSize: "1.15rem" }}>{node.title}</strong>
          <span className="ruta-a-sub">{node.artist}</span>
        </div>
      </div>
      <Field label="Año" value={node.year} max={4} placeholder="2014" onChange={(v) => onChange((n) => (n.year = v))} />
      <Field label="Por qué está aquí" multiline max={400} value={node.why} placeholder="Lo que le dirías a alguien antes de ponérselo" onChange={(v) => onChange((n) => (n.why = v))} />
      {node.isStart && (
        <>
          <Field label="Frase de inicio" value={node.lead} max={60} placeholder="Empieza aquí." onChange={(v) => onChange((n) => (n.lead = v))} />
          <Field label="Texto bajo la portada" value={node.leadText} max={200} placeholder="Voz y guitarra, nada más." onChange={(v) => onChange((n) => (n.leadText = v))} />
        </>
      )}
      {!isLastInBranch && (
        <>
          <Field label="Flecha hacia el siguiente · motivo corto" value={node.edgeLead} max={60} placeholder="Ahora, con cuerdas." onChange={(v) => onChange((n) => (n.edgeLead = v))} />
          <Field label="Flecha · explicación" multiline max={240} value={node.edge} placeholder="Qué cambia al pasar al siguiente disco" onChange={(v) => onChange((n) => (n.edge = v))} />
        </>
      )}
      <div className="rt-row-btns">
        {!node.isStart && (
          <button className="btn btn-quiet btn-sm" onClick={onMakeStart}>
            Empieza aquí
          </button>
        )}
        <button className="btn btn-quiet btn-sm" onClick={() => onMove(-1)}>← Mover</button>
        <button className="btn btn-quiet btn-sm" onClick={() => onMove(1)}>Mover →</button>
        <button className="btn btn-quiet btn-sm" onClick={onRemove}>Quitar</button>
      </div>
    </>
  );
}

function BranchPanel({ branch, isLast, canDelete, onChange, onDelete }: {
  branch: RutaBranch; isLast: boolean; canDelete: boolean; onChange: (fn: (b: RutaBranch) => void) => void; onDelete: () => void;
}) {
  return (
    <>
      <span className="ruta-kicker">RAMA</span>
      <Field label="Nombre de la rama" value={branch.label} max={60} placeholder="Hacia atrás" onChange={(v) => onChange((b) => (b.label = v))} />
      {!isLast && (
        <>
          <Field label="Puente a la siguiente rama · motivo" value={branch.bridgeLead} max={80} placeholder="¿Te ha gustado? Vuelve atrás." onChange={(v) => onChange((b) => (b.bridgeLead = v))} />
          <Field label="Puente · explicación" multiline max={300} value={branch.bridge} placeholder="Por qué se pasa de esta rama a la siguiente" onChange={(v) => onChange((b) => (b.bridge = v))} />
        </>
      )}
      {canDelete && (
        <button className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} onClick={onDelete}>
          Borrar la rama
        </button>
      )}
    </>
  );
}

// Buscador de discos (y canciones) para añadir una parada
function AddNodePanel({ branchLabel, artistHint, onPick }: {
  branchLabel: string;
  artistHint: string;
  onPick: (p: { type: "album" | "track"; id: string; name: string; artistName: string; imageUrl: string | null }) => void;
}) {
  const [query, setQuery] = useState(artistHint);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => alive && setResults(r))
        .catch(() => {})
        .finally(() => alive && setSearching(false));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const row = (type: "album" | "track", r: SearchResponse["albums"][number]) => (
    <div key={r.id} className="res-row" onClick={() => onPick({ type, id: r.id, name: r.name, artistName: r.artistName, imageUrl: r.imageUrl })}>
      {r.imageUrl ? <img className="result-cover" src={r.imageUrl} alt="" /> : <span className="result-cover cover-placeholder">♪</span>}
      <div className="result-name">
        {r.name}
        <small>{type === "album" ? `disco · ${r.artistName}` : r.artistName}</small>
      </div>
      <button className="btn btn-quiet btn-sm">Añadir</button>
    </div>
  );

  return (
    <>
      <span className="ruta-kicker">AÑADIR A «{branchLabel.toUpperCase()}»</span>
      <div className="rt-edit-field">
        <label>Busca un disco</label>
        <input autoFocus placeholder="Disco o artista…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {searching && <p className="section-sub">Buscando…</p>}
      {results && (
        <div className="rt-search-results">
          <div className="search-cat">Discos</div>
          {results.albums.map((a) => row("album", a))}
          <div className="search-cat">Canciones</div>
          {results.tracks.slice(0, 5).map((t) => row("track", t))}
        </div>
      )}
    </>
  );
}

// Compartir la ruta por chat: lleva a la conversación con el enlace ya escrito
function SharePanel({ rutaId, title, onClose }: { rutaId: string; title: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState<UserSummary[] | null>(null);
  useEffect(() => {
    api.get<UserSummary[]>("/api/users").then((u) => setPeople(u.filter((p) => p.isFollowedByMe).concat(u.filter((p) => !p.isFollowedByMe)))).catch(() => setPeople([]));
  }, []);
  const url = `${window.location.origin}${import.meta.env.BASE_URL}rutas/${rutaId}`.replace(/([^:]\/)\/+/g, "$1");
  return (
    <>
      <span className="ruta-kicker">COMPARTIR LA RUTA</span>
      <p className="section-sub">Elige a quién se la mandas. El mensaje llega ya escrito y lo envías tú.</p>
      {people === null && <p className="section-sub">Cargando…</p>}
      <div className="rt-share-list">
        {people?.map((p) => (
          <button key={p.id} onClick={() => navigate(`/chats/${p.id}`, { state: { prefill: `Te paso esta ruta para empezar: ${title} ${url}` } })}>
            <AuthorAvatar name={p.displayName} url={p.avatarUrl} />
            {p.displayName}
          </button>
        ))}
      </div>
      <div className="rt-row-btns">
        <button className="btn btn-quiet btn-sm" onClick={() => navigator.clipboard.writeText(url).catch(() => {})}>
          Copiar enlace
        </button>
        <button className="btn btn-quiet btn-sm" onClick={onClose}>
          Volver
        </button>
      </div>
    </>
  );
}
