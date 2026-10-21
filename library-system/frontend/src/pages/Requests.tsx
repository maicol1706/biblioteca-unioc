import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Requests() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    setRows(await api("/loan-requests"));
  }
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function act(id: string, action: "approve" | "reject" | "cancel") {
    try {
      await api(`/loan-requests/${id}/${action}`, { method: "POST", body: "{}" });
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Circulación</div>
          <h2 style={{ margin: 0 }}>Solicitudes</h2>
        </div>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Obra</th>
            <th>Solicitante</th>
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
              <td>
                <span className="pill">{row.status}</span>
              </td>
              <td className="row">
                {row.status === "PENDING" && can("loans.approve") && (
                  <>
                    <button className="btn" onClick={() => act(row.id, "approve")}>
                      Aprobar
                    </button>
                    <button className="btn danger" onClick={() => act(row.id, "reject")}>
                      Rechazar
                    </button>
                  </>
                )}
                {row.status === "PENDING" && (
                  <button className="btn secondary" onClick={() => act(row.id, "cancel")}>
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
