import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function UsersPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  async function load() {
    setRows(await api("/users"));
  }
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Identidad local</div>
          <h2 style={{ margin: 0 }}>Usuarios</h2>
        </div>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>
                {u.firstName} {u.lastName}
              </td>
              <td>{u.email}</td>
              <td>{u.roles?.map((r: any) => r.role.code).join(", ")}</td>
              <td>
                <span className={`pill ${u.isActive ? "" : "bad"}`}>{u.isActive ? "ACTIVO" : "INACTIVO"}</span>
              </td>
              <td>
                {can("users.manage") && (
                  <button
                    className="btn secondary"
                    onClick={async () => {
                      await api(`/users/${u.id}/active`, {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: !u.isActive }),
                      });
                      await load();
                    }}
                  >
                    {u.isActive ? "Desactivar" : "Activar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
