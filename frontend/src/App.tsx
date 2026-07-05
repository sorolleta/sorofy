import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { getToken, clearToken, loginUrl, needsOnboarding, setNeedsOnboarding } from "./api";
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

function Login() {
  if (getToken()) return <Navigate to="/feed" replace />;
  return (
    <div className="login">
      <h1>Sorofy</h1>
      <p>Música contada por personas, no por algoritmos. Descubre a tu ritmo.</p>
      <a className="btn btn-spotify" href={loginUrl()}>
        Entrar con Spotify
      </a>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  if (!getToken()) return <Navigate to="/" replace />;
  // El onboarding es obligatorio: sin completarlo no se navega al resto
  if (needsOnboarding()) return <Navigate to="/onboarding" replace />;

  const logout = () => {
    clearToken();
    setNeedsOnboarding(false);
    navigate("/");
  };

  return (
    <>
      <nav className="nav">
        <span className="nav-brand">Sorofy</span>
        <Link to="/feed">Feed</Link>
        <Link to="/notas">Notas</Link>
        <Link to="/gente">Gente</Link>
        <Link to="/chats">Chats</Link>
        <Link to="/perfil">Mi perfil</Link>
        <button className="btn-link" onClick={logout}>
          Salir
        </button>
      </nav>
      <main className="container">{children}</main>
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
        <Route path="/feed" element={<Layout><Feed /></Layout>} />
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
