import type { ReactNode } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import Catalog from "./pages/Catalog";
import Loans from "./pages/Loans";
import Requests from "./pages/Requests";
import Reservations from "./pages/Reservations";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import Jarvis from "./pages/Jarvis";
import Inbox from "./pages/Inbox";

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="main">Cargando sesión…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Shell() {
  const { user, can, logout } = useAuth();
  const links = [
    { to: "/catalogo", label: "Catálogo", show: can("catalog.read") },
    { to: "/prestamos", label: "Préstamos", show: can("loans.read_own") || can("loans.approve") },
    { to: "/solicitudes", label: "Solicitudes", show: can("loans.request") || can("loans.approve") },
    { to: "/reservas", label: "Reservas", show: can("reservations.create") },
    { to: "/avisos", label: "Avisos", show: true },
    { to: "/jarvis", label: "JARVIS", show: can("ai.use") },
    { to: "/tablero", label: "Tablero", show: can("reports.read") },
    { to: "/usuarios", label: "Usuarios", show: can("users.read") },
    { to: "/ajustes", label: "Ajustes", show: can("settings.manage") },
  ];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Biblioteca U.</div>
        {links.filter((l) => l.show).map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {l.label}
          </NavLink>
        ))}
        <div className="who">
          <div>{user?.fullName}</div>
          <div>{user?.roles.join(" · ")}</div>
          <button className="linkish" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/prestamos" element={<Loans />} />
          <Route path="/solicitudes" element={<Requests />} />
          <Route path="/reservas" element={<Reservations />} />
          <Route path="/avisos" element={<Inbox />} />
          <Route path="/jarvis" element={<Jarvis />} />
          <Route path="/tablero" element={<Dashboard />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="main">Cargando…</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/catalogo" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      />
    </Routes>
  );
}
