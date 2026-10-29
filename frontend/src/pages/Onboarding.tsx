import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, getToken, setNeedsOnboarding } from "../api";
import type { LocalGroup } from "../types";

type TagOption = { id: number; name: string };
type Options = { tags: TagOption[]; provinces: string[] };

// Paso 3: a quién seguir para que el feed no llegue vacío el primer día
type Suggestions = {
  people: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    reason: string | null;
    isFollowedByMe: boolean;
  }[];
  groups: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: string | null;
    province: string | null;
    isFollowedByMe: boolean;
  }[];
};

// El primer login pasa por aquí obligatoriamente, en tres fases como un
// paseo: sensibilidades, provincia y a quién seguir. Los dos primeros pasos
// alimentan el feed (mapeo afín + proximidad local); el tercero lo estrena.
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<Options | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [province, setProvince] = useState("");
  const [nearbyGroups, setNearbyGroups] = useState<LocalGroup[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [followedPeople, setFollowedPeople] = useState<Set<string>>(new Set());
  const [followedGroups, setFollowedGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Options>("/api/onboarding")
      .then(setOptions)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  // "Editar perfil" reutiliza este mismo camino: si el onboarding ya se
  // completó, el formulario llega con lo elegido y al acabar vuelve al perfil
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!options) return;
    api
      .get<{ needsOnboarding: boolean; province: string | null; tags: string[] }>("/api/me")
      .then((me) => {
        if (me.needsOnboarding) return;
        setEditing(true);
        setProvince(me.province ?? "");
        setTagIds(options.tags.filter((t) => me.tags.includes(t.name)).map((t) => t.id));
      })
      .catch(() => {});
  }, [options]);

  // El panel "Cerca de ti" enseña qué grupos esperan en la provincia elegida
  useEffect(() => {
    if (!province) {
      setNearbyGroups([]);
      return;
    }
    api
      .get<LocalGroup[]>(`/api/local-groups?province=${encodeURIComponent(province)}`)
      .then(setNearbyGroups)
      .catch(() => setNearbyGroups([]));
  }, [province]);

  if (!getToken()) return <Navigate to="/" replace />;

  const toggleTag = (id: number) => {
    setTagIds((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      return prev.length < 4 ? [...prev, id] : prev;
    });
  };

  // Al salir del paso 2 se guarda todo; repetirlo reemplaza, así que
  // volver atrás y cambiar algo no rompe nada
  const saveAndGoToFollows = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/api/onboarding", { tagIds, province });
      const s = await api.get<Suggestions>("/api/onboarding/suggestions");
      setSuggestions(s);
      setFollowedPeople(new Set(s.people.filter((p) => p.isFollowedByMe).map((p) => p.id)));
      setFollowedGroups(new Set(s.groups.filter((g) => g.isFollowedByMe).map((g) => g.id)));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const togglePersonFollow = async (id: string) => {
    const followed = followedPeople.has(id);
    if (followed) {
      await api.delete(`/api/users/${id}/follow`).catch(() => {});
    } else {
      await api.post(`/api/users/${id}/follow`).catch(() => {});
    }
    setFollowedPeople((prev) => {
      const next = new Set(prev);
      if (followed) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupFollow = async (id: string) => {
    const followed = followedGroups.has(id);
    if (followed) {
      await api.delete(`/api/local-groups/${id}/follow`).catch(() => {});
    } else {
      await api.post(`/api/local-groups/${id}/follow`).catch(() => {});
    }
    setFollowedGroups((prev) => {
      const next = new Set(prev);
      if (followed) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = () => {
    setNeedsOnboarding(false);
    navigate(editing ? "/perfil" : "/feed", { replace: true });
  };

  const stepHead = (icon: string, iconBg: string, num: number, title: string, sub: string) => (
    <div className="onb-head">
      <div className="onb-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="onb-head-text">
        <span className="onb-step-label">Paso {num} de 3</span>
        <h2 className="section-title onb-title">{title}</h2>
        <p className="section-sub onb-sub">{sub}</p>
      </div>
    </div>
  );

  return (
    <main className="app-col onboarding">
      <div className="onb-dots">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`onb-dot${step === n ? " is-active" : ""}`} />
        ))}
      </div>

      {!options && !error && (
        <div className="loading-state">
          <span className="spinner" />
          Cargando…
        </div>
      )}
      {!options && error && <p className="error">{error}</p>}

      {options && step === 1 && (
        <div className="onb-step is-active">
          {stepHead(
            "🎧",
            "linear-gradient(135deg,var(--accent),#3a3466)",
            1,
            "¿Cómo escuchas?",
            "Elige de 3 a 4 sensibilidades. No son géneros: son maneras de escuchar. Solo las verás tú.",
          )}
          <div className="onboarding-tags">
            <span className="tag-count">{tagIds.length}/4 elegidas</span>
            <div className="tag-grid">
              {options.tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-chip${tagIds.includes(tag.id) ? " is-selected" : ""}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <div className="onb-spacer" />
          <button
            className="btn btn-primary onb-next"
            disabled={tagIds.length < 3}
            onClick={() => setStep(2)}
          >
            Siguiente
          </button>
          <p className="section-sub onboarding-hint">
            El botón se activa con 3 o 4 sensibilidades elegidas.
          </p>
        </div>
      )}

      {options && step === 2 && (
        <div className="onb-step is-active">
          {stepHead(
            "📍",
            "linear-gradient(135deg,#5b6478,#39404f)",
            2,
            "¿Desde dónde escuchas?",
            "Con tu provincia te unimos a los grupos y notas de gente cerca de ti.",
          )}
          <div className="tag-grid">
            {options.provinces.map((p) => (
              <button
                key={p}
                type="button"
                className={`prov-chip${province === p ? " is-selected" : ""}`}
                onClick={() => setProvince(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="panel onb-nearby">
            <h3 className="section-title panel-title">Cerca de ti</h3>
            {!province ? (
              <p className="section-sub">Elige tu provincia para ver sus grupos locales.</p>
            ) : nearbyGroups.length > 0 ? (
              <p className="section-sub">
                Te esperan{" "}
                {nearbyGroups.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && (i === nearbyGroups.length - 1 ? " y " : ", ")}
                    <strong className="common-name">{g.name}</strong>
                  </span>
                ))}
                . Sus notas llevan la dedicatoria «Cerca de ti · {province}».
              </p>
            ) : (
              <p className="section-sub">
                Aún no hay grupos de {province}. Sus notas llevarán la dedicatoria
                «Cerca de ti · {province}» cuando alguien los cree.
              </p>
            )}
          </div>
          <div className="onb-spacer" />
          {error && <p className="error">{error}</p>}
          <div className="onb-nav-row">
            <button className="btn btn-ghost onb-back" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button
              className="btn btn-primary onb-next"
              disabled={!province || saving}
              onClick={saveAndGoToFollows}
            >
              {saving ? "Guardando…" : "Siguiente"}
            </button>
          </div>
        </div>
      )}

      {options && step === 3 && suggestions && (
        <div className="onb-step is-active">
          {stepHead(
            "👥",
            "linear-gradient(135deg,#8a6d3f,#5c4a2e)",
            3,
            "Sigue a alguien para empezar",
            "Para que el feed no llegue vacío el primer día — puedes cambiarlo luego.",
          )}
          <div className="onb-follows">
            {suggestions.people.map((person) => (
              <div key={person.id} className="person-row">
                {person.avatarUrl ? (
                  <img className="person-avatar" src={person.avatarUrl} alt="" />
                ) : (
                  <span className="person-avatar avatar-placeholder">
                    {person.displayName[0]?.toUpperCase() ?? "♪"}
                  </span>
                )}
                <div className="person-name">
                  {person.displayName}
                  {person.reason && <small>{person.reason}</small>}
                </div>
                <button
                  className={`btn btn-ghost btn-sm btn-follow${followedPeople.has(person.id) ? " is-following" : ""}`}
                  onClick={() => togglePersonFollow(person.id)}
                >
                  {followedPeople.has(person.id) ? "Siguiendo" : "Seguir"}
                </button>
              </div>
            ))}
            {suggestions.groups.map((group) => (
              <div key={group.id} className="person-row">
                {group.imageUrl ? (
                  <img className="person-avatar" src={group.imageUrl} alt="" />
                ) : (
                  <span className="person-avatar avatar-placeholder">🎺</span>
                )}
                <div className="person-name">
                  {group.name}
                  <small>
                    {group.category ?? "Grupo local"}
                    {group.province && ` · ${group.province}`}
                  </small>
                </div>
                <button
                  className={`btn btn-ghost btn-sm btn-follow${followedGroups.has(group.id) ? " is-following" : ""}`}
                  onClick={() => toggleGroupFollow(group.id)}
                >
                  {followedGroups.has(group.id) ? "Siguiendo" : "Seguir"}
                </button>
              </div>
            ))}
            {suggestions.people.length === 0 && suggestions.groups.length === 0 && (
              <p className="section-sub">
                Todavía no hay a quién seguir por aquí — el feed de horizontes te
                irá enseñando gente.
              </p>
            )}
          </div>
          <div className="onb-spacer" />
          <div className="onb-nav-row">
            <button className="btn btn-ghost onb-back" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button className="btn btn-primary onb-next" onClick={finish}>
              Empezar a descubrir
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
