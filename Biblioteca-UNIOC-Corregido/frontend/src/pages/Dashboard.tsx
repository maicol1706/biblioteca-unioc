import { useEffect, useState } from "react";
import { api } from "../api";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/reports/overview").then(setData).catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Cargando tablero…</p>;
  const cards = [
    ["Usuarios", data.users],
    ["Obras", data.books],
    ["Ejemplares", data.copies],
    ["Disponibles", data.available],
    ["Préstamos activos", data.activeLoans],
    ["Vencidos", data.overdue],
    ["Solicitudes", data.pendingRequests],
    ["Reservas en cola", data.queuedReservations],
  ];
  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Gestión</div>
          <h2 style={{ margin: 0 }}>Tablero</h2>
        </div>
      </div>
      <div className="grid">
        {cards.map(([label, value]) => (
          <article className="card" key={String(label)}>
            <div className="meta">{label}</div>
            <div className="stat">{value}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
