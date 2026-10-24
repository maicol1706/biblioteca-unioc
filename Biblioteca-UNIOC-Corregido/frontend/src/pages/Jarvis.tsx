import { FormEvent, useState } from "react";
import { api } from "../api";

type Msg = { role: "user" | "bot"; text: string };

export default function Jarvis() {
  const [input, setInput] = useState("busca cálculo");
  const [conversationId, setConversationId] = useState<string>();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Soy JARVIS. Pregúntame por un libro, tus préstamos o las estadísticas. No consulto la base de datos directo: uso tools con tu permiso.",
    },
  ]);
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string; conversationId: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, conversationId }),
      });
      setConversationId(res.conversationId);
      setMsgs((prev) => [...prev, { role: "bot", text: res.reply }]);
    } catch (err: any) {
      setMsgs((prev) => [...prev, { role: "bot", text: err.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Asistente</div>
          <h2 style={{ margin: 0 }}>JARVIS</h2>
        </div>
      </div>
      <div className="chat">
        <div className="msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "user" : "bot"}`}>
              {m.text}
            </div>
          ))}
        </div>
        <form className="composer" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe a JARVIS" />
          <button className="btn gold" disabled={busy}>
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
