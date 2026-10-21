import { FormEvent, useState } from "react";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("ana.estudiante@universidad.edu");
  const [password, setPassword] = useState("Prueba123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="eyebrow">Sistema inteligente</div>
        <h1>Biblioteca universitaria</h1>
        <p className="hint">Identidad local de prueba. Q10 se conecta solo con API oficial.</p>
        <label>Correo institucional</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Contraseña</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        <div className="row">
          <button className="btn" disabled={busy} type="submit">
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <p className="hint" style={{ marginTop: 16 }}>
          Prueba: ana.estudiante@universidad.edu, bibliotecaria@universidad.edu o superadmin@universidad.edu.
          Contraseña: Prueba123!
        </p>
      </form>
    </div>
  );
}
