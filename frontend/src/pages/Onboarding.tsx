import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, getToken, setNeedsOnboarding } from "../api";

type TagOption = { id: number; name: string };
type Options = { tags: TagOption[]; provinces: string[] };

// El primer login pasa por aquí obligatoriamente: 3-4 tags estéticos y la
// provincia. Con esa señal el feed nunca nace vacío (mapeo con perfiles
// afines y proximidad local).
export default function Onboarding() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<Options | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [province, setProvince] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Options>("/api/onboarding")
      .then(setOptions)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  if (!getToken()) return <Navigate to="/" replace />;

  const toggleTag = (id: number) => {
    setTagIds((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      return prev.length < 4 ? [...prev, id] : prev;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/api/onboarding", { tagIds, province });
      setNeedsOnboarding(false);
      navigate("/feed", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  };

  const ready = tagIds.length >= 3 && province !== "";

  return (
    <main className="app-col onboarding">
      <div className="onboarding-head">
        <h1 className="section-title onboarding-title">Bienvenido a Sorofy</h1>
        <p className="section-sub">
          Elige de 3 a 4 sensibilidades. No son géneros: son maneras de
          escuchar. Solo las verás tú.
        </p>
      </div>

      {!options && !error && (
        <div className="loading-state">
          <span className="spinner" />
          Cargando…
        </div>
      )}
      {!options && error && <p className="error">{error}</p>}

      {options && (
        <>
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

          <div className="field">
            <label htmlFor="provincia">Tu provincia (para los grupos locales)</label>
            <select
              id="provincia"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">Elige tu provincia…</option>
              {options.provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" disabled={!ready || saving} onClick={save}>
            {saving ? "Guardando…" : "Empezar a descubrir"}
          </button>
          <p className="section-sub onboarding-hint">
            El botón se activa con 3 o 4 sensibilidades elegidas y tu provincia.
          </p>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </main>
  );
}
