import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Loans() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    setRows(await api("/loans"));
  }
  useEffect(() => {
    load().catch((e) => setMsg(e.message));
  }, []);

  async function giveBack(id: string) {
    try {
      await api(`/loans/${id}/return`, { method: "POST", body: "{}" });
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
          <h2 style={{ margin: 0 }}>Préstamos</h2>
        </div>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Obra</th>
            <th>Usuario</th>
            <th>Estado</th>
            <th>Vence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((loan) => (
            <tr key={loan.id}>
              <td>{loan.copy?.book?.title}</td>
              <td>
                {loan.user?.firstName} {loan.user?.lastName}
              </td>
              <td>
                <span className={`pill ${loan.status === "OVERDUE" ? "bad" : ""}`}>{loan.status}</span>
              </td>
              <td>{String(loan.dueOn).slice(0, 10)}</td>
              <td>
                {can("loans.return") && ["ACTIVE", "OVERDUE"].includes(loan.status) && (
                  <button className="btn secondary" onClick={() => giveBack(loan.id)}>
                    Devolver
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
