import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api";

// La API redirige aquí tras el login con el JWT en el fragment (#token=...)
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (token) {
      setToken(token);
      // Limpiar el token de la URL antes de seguir
      window.history.replaceState(null, "", "/auth/callback");
      navigate("/feed", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return <p className="container">Entrando…</p>;
}
