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
    <main className="container onboarding">
      <h1>Bienvenido a Sorofy</h1>
      <p>
        Antes de empezar, cuéntanos qué te mueve. Con esto preparamos tu
        primer feed: nada de rankings, música elegida para ti.
      </p>

      {!options && !error && <p className="muted">Cargando…</p>}
      {!options && error && <p className="error">{error}</p>}

      {options && (
        <>
          <h2>
            Elige 3 o 4 sensibilidades{" "}
            <span className="muted">({tagIds.length}/4)</span>
          </h2>
          <div className="tag-grid">
            {options.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`tag-chip${tagIds.includes(tag.id) ? " selected" : ""}`}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>

          <h2>¿Desde dónde escuchas?</h2>
          <p className="muted">
            Tu provincia nos sirve para acercarte la música local: charangas,
            grupos de tu zona…
          </p>
          <select value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">Elige tu provincia…</option>
            {options.provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="note-form-actions">
            <button className="btn" disabled={!ready || saving} onClick={save}>
              {saving ? "Guardando…" : "Empezar a descubrir"}
            </button>
            {error && <span className="error">{error}</span>}
          </div>
        </>
      )}
    </main>
  );
}
