import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, setNeedsOnboarding, setToken } from "../api";

// La API redirige aquí tras el login con el JWT en el fragment (#token=...)
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // StrictMode monta el efecto dos veces: el flag evita navegar desde
    // la petición del montaje ya descartado
    let active = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    setToken(token);
    // Limpiar el token de la URL antes de seguir
    window.history.replaceState(null, "", `${import.meta.env.BASE_URL}auth/callback`.replace("//", "/"));

    // El primer login pasa por el onboarding; los demás van al feed
    api
      .get<{ needsOnboarding: boolean }>("/api/me")
      .then((me) => {
        if (!active) return;
        setNeedsOnboarding(me.needsOnboarding);
        navigate(me.needsOnboarding ? "/onboarding" : "/feed", { replace: true });
      })
      .catch(() => {
        if (active) navigate("/feed", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="loading-state">
      <span className="spinner" />
      Entrando…
    </div>
  );
}
