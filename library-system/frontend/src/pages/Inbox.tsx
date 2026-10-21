import { useEffect, useState } from "react";
import { api } from "../api";

export default function Inbox() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() {
    setRows(await api("/notifications"));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Comunicación</div>
          <h2 style={{ margin: 0 }}>Avisos</h2>
        </div>
        <button
          className="btn secondary"
          onClick={async () => {
            await api("/notifications/read-all", { method: "POST", body: "{}" });
            await load();
          }}
        >
          Marcar leídos
        </button>
      </div>
      <div className="grid">
        {rows.map((n) => (
          <article className="card" key={n.id}>
            <h3>{n.title}</h3>
            <p className="hint">{n.body}</p>
            <span className={`pill ${n.readAt ? "" : "warn"}`}>{n.readAt ? "LEÍDO" : "NUEVO"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
