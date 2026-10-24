import { useEffect, useState } from "react";
import { api } from "../api";

export default function Reservations() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  async function load() {
    setRows(await api("/reservations"));
  }
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Cola</div>
          <h2 style={{ margin: 0 }}>Reservas</h2>
        </div>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Obra</th>
            <th>Usuario</th>
            <th>Posición</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.book?.title}</td>
              <td>
                {row.user?.firstName} {row.user?.lastName}
              </td>
              <td>{row.queuePosition}</td>
              <td>
                <span className="pill">{row.status}</span>
              </td>
              <td>
                {["QUEUED", "NOTIFIED"].includes(row.status) && (
                  <button
                    className="btn secondary"
                    onClick={async () => {
                      await api(`/reservations/${row.id}/cancel`, { method: "POST", body: "{}" });
                      await load();
                    }}
                  >
                    Cancelar
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
