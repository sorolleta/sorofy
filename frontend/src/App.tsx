import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, NavLink, useNavigate } from "react-router-dom";
import { getToken, clearToken, getMe, loginUrl, needsOnboarding, setNeedsOnboarding } from "./api";
import type { MyProfile } from "./types";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import People from "./pages/People";
import UserDetail from "./pages/UserDetail";
import Feed from "./pages/Feed";
import Notes from "./pages/Notes";
import MusicItemDetail from "./pages/MusicItemDetail";
import Chats from "./pages/Chats";
import ChatThread from "./pages/ChatThread";

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.4 14.5a.7.7 0 0 1-.96.24c-2.6-1.6-5.9-1.95-9.8-1.06a.7.7 0 0 1-.3-1.37c4.2-.96 7.8-.55 10.7 1.22.33.2.44.64.24.97Zm1.2-2.9a.87.87 0 0 1-1.2.3c-3-1.85-7.6-2.38-11.1-1.3a.87.87 0 1 1-.5-1.67c4-1.2 9.1-.62 12.6 1.5.4.25.53.78.28 1.17Zm.1-3a1.05 1.05 0 0 1-1.44.36C13.1 9 8 8.8 4.9 9.74a1.05 1.05 0 1 1-.6-2c3.6-1.1 9.3-.9 13.1 1.4.5.3.66.94.36 1.44Z" />
    </svg>
  );
}

// Collage de la portada: pares de gradiente que evocan carátulas
// (sin sesión no hay API de la que sacar imágenes reales)
const collageTiles = [
  ["#2c3242", "#1a1d26"], ["#8a6d3f", "#5c4a2e"], ["#334032", "#1c221c"],
  ["#3a3242", "#241f2b"], ["#40342c", "#241d18"], ["#5b6478", "#39404f"],
  ["rgba(245,166,35,0.5)", "rgba(245,166,35,0.12)"], ["#324038", "#1c2620"],
  ["#6b5252", "#473838"], ["#42342a", "#2a211a"], ["#2c3242", "#1a1d26"],
  ["#556b52", "#38473a"], ["#3a3242", "#241f2b"], ["#334032", "#1c221c"],
  ["rgba(111,168,255,0.4)", "rgba(111,168,255,0.1)"], ["#8a6d3f", "#5c4a2e"],
  ["#40342c", "#241d18"], ["#5b6478", "#39404f"], ["#324038", "#1c2620"],
  ["rgba(217,143,224,0.4)", "rgba(217,143,224,0.1)"], ["#42342a", "#2a211a"],
  ["#2c3242", "#1a1d26"], ["#6b5252", "#473838"], ["#556b52", "#38473a"],
];

function Login() {
  if (getToken()) return <Navigate to="/feed" replace />;
  return (
    <div className="hero">
      <div className="hero-collage" aria-hidden="true">
        {collageTiles.map(([from, to], i) => (
          <div key={i} style={{ background: `linear-gradient(135deg,${from},${to})` }} />
        ))}
      </div>
      <div className="hero-inner">
        <span className="nav-logo hero-logo">Sorofy</span>
        <h1 className="hero-title">Música contada por personas, no por algoritmos.</h1>
        <p className="hero-sub">
          Guarda lo que te toca, cuenta por qué, y descubre a tu ritmo lo que tu
          gente está escuchando de verdad. Sin likes, sin rankings, sin ansiedad.
        </p>
        <a className="btn btn-primary" href={loginUrl()}>
          <SpotifyIcon />
          Entrar con Spotify
        </a>
        <p className="note-track-date">Gratis. Tu música se queda en tu Spotify.</p>
      </div>
    </div>
  );
}

function Layout({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const navigate = useNavigate();
  const [me, setMe] = useState<MyProfile | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    getMe().then(setMe).catch(() => {});
  }, []);

  if (!getToken()) return <Navigate to="/" replace />;
  // El onboarding es obligatorio: sin completarlo no se navega al resto
  if (needsOnboarding()) return <Navigate to="/onboarding" replace />;

  const logout = () => {
    clearToken();
    setNeedsOnboarding(false);
    navigate("/");
  };

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " is-here" : ""}`;

  return (
    <>
      <nav className="nav">
        <Link to="/feed" className="nav-logo">
          Sorofy
        </Link>
        <Link to="/notas" className="nav-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          Buscar música o gente…
        </Link>
        <div className="nav-links">
          <NavLink to="/feed" className={navLink}>Feed</NavLink>
          <NavLink to="/notas" className={navLink}>Notas</NavLink>
          <NavLink to="/gente" className={navLink}>Gente</NavLink>
          <NavLink to="/chats" className={navLink}>Chats</NavLink>
        </div>
        <div className="nav-side">
          <button className="nav-link" onClick={logout}>
            Salir
          </button>
          <Link to="/perfil" title="Mi perfil">
            {me?.avatarUrl ? (
              <img className="nav-avatar" src={me.avatarUrl} alt="Mi perfil" />
            ) : (
              <span className="nav-avatar">{me?.displayName?.[0]?.toUpperCase() ?? "·"}</span>
            )}
          </Link>
        </div>
      </nav>
      <main className={wide ? "app-col feed-wide" : "app-col"}>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/perfil" element={<Layout><Profile /></Layout>} />
        <Route path="/gente" element={<Layout><People /></Layout>} />
        <Route path="/gente/:id" element={<Layout><UserDetail /></Layout>} />
        <Route path="/feed" element={<Layout wide><Feed /></Layout>} />
        <Route path="/notas" element={<Layout><Notes /></Layout>} />
        <Route path="/musica/:id" element={<Layout><MusicItemDetail /></Layout>} />
        {/* La ruta vieja de reseñas lleva a las notas, su sucesora */}
        <Route path="/resenas" element={<Navigate to="/notas" replace />} />
        <Route path="/chats" element={<Layout><Chats /></Layout>} />
        <Route path="/chats/:id" element={<Layout><ChatThread /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
