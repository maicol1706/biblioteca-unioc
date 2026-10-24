import { useEffect, useState } from "react";
import { api, downloadAuthorized, upload } from "../api";

export default function SettingsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q10, setQ10] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [fromQ10, setFromQ10] = useState(true);

  async function refresh() {
    const [settings, status, logs] = await Promise.all([
      api("/settings"),
      api("/q10/status").catch(() => null),
      api("/imports/history").catch(() => []),
    ]);
    setRows(settings);
    setQ10(status);
    setHistory(logs);
  }

  useEffect(() => {
    refresh().catch((e) => setMsg(e.message));
  }, []);

  async function send(kind: "users" | "catalog", file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const query = kind === "users" && fromQ10 ? "?source=q10" : "";
      const data = await upload(`/imports/${kind}`, file, query);
      setResult(data);
      await refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo cargar el archivo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Gobierno</div>
          <h2 style={{ margin: 0 }}>Ajustes</h2>
        </div>
      </div>
      {msg && <p className="hint">{msg}</p>}

      {q10 && (
        <article className="card" style={{ marginBottom: 16 }}>
          <h3>Q10</h3>
          <p className="hint">{q10.message}</p>
          <span className="pill warn">{q10.identityProvider}</span>
        </article>
      )}

      <article className="card" style={{ marginBottom: 16 }}>
        <h3>Cargar datos por archivo</h3>
        <p className="hint">
          Q10 no tiene API oficial conectada. El camino válido es exportar desde Q10 (Excel/CSV),
          ajustar las columnas a la plantilla y subir el archivo aquí. No se inventan endpoints.
        </p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
          <input type="checkbox" checked={fromQ10} onChange={(e) => setFromQ10(e.target.checked)} style={{ width: "auto" }} />
          Este archivo de usuarios viene de una exportación Q10
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => downloadAuthorized("/imports/templates/users.csv", "plantilla-usuarios-q10.csv")}
          >
            Descargar plantilla usuarios
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => downloadAuthorized("/imports/templates/catalog.csv", "plantilla-catalogo.csv")}
          >
            Descargar plantilla catálogo
          </button>
        </div>
        <label>Usuarios (CSV)</label>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => send("users", e.target.files?.[0])}
        />
        <label>Catálogo de libros (CSV)</label>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => send("catalog", e.target.files?.[0])}
        />
        {busy && <p className="hint">Cargando archivo…</p>}
        {result && (
          <p className="hint">
            {result.status}: {result.imported} bien, {result.failed} con error.
            {result.defaultPassword ? ` Clave inicial de cuentas nuevas: ${result.defaultPassword}` : ""}
            {result.errors?.length ? ` Detalle: ${result.errors.join(" · ")}` : ""}
          </p>
        )}
      </article>

      {history.length > 0 && (
        <article className="card" style={{ marginBottom: 16 }}>
          <h3>Historial de cargas</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th>OK</th>
                <th>Error</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.startedAt).toLocaleString()}</td>
                  <td>{row.status}</td>
                  <td>{row.recordsOk}</td>
                  <td>{row.recordsFailed}</td>
                  <td>{row.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Clave</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{JSON.stringify(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
