import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { getToken, clearToken, loginUrl } from "./api";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import People from "./pages/People";
import UserDetail from "./pages/UserDetail";
import Feed from "./pages/Feed";
import Reviews from "./pages/Reviews";

function Login() {
  if (getToken()) return <Navigate to="/perfil" replace />;
  return (
    <div className="login">
      <h1>SameSpot</h1>
      <p>Mismo punto, misma música. Descubre gente que escucha lo que tú.</p>
      <a className="btn btn-spotify" href={loginUrl()}>
        Entrar con Spotify
      </a>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  if (!getToken()) return <Navigate to="/" replace />;

  const logout = () => {
    clearToken();
    navigate("/");
  };

  return (
    <>
      <nav className="nav">
        <span className="nav-brand">SameSpot</span>
        <Link to="/perfil">Mi perfil</Link>
        <Link to="/gente">Gente</Link>
        <Link to="/feed">Feed</Link>
        <Link to="/resenas">Reseñas</Link>
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
        <Route path="/perfil" element={<Layout><Profile /></Layout>} />
        <Route path="/gente" element={<Layout><People /></Layout>} />
        <Route path="/gente/:id" element={<Layout><UserDetail /></Layout>} />
        <Route path="/feed" element={<Layout><Feed /></Layout>} />
        <Route path="/resenas" element={<Layout><Reviews /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
