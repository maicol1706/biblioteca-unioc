import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

type Book = {
  id: string;
  title: string;
  subtitle?: string;
  isbn?: string;
  physicalLocation?: string;
  category?: { name: string };
  authors: { fullName: string }[];
  availability: { total: number; available: number };
};

export default function Catalog() {
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [msg, setMsg] = useState("");

  async function load(query = q) {
    const data = await api<Book[]>(`/books${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setBooks(data);
  }

  useEffect(() => {
    load("").catch((e) => setMsg(e.message));
  }, []);

  async function requestBook(book: Book) {
    setMsg("");
    try {
      if (book.availability.available > 0) {
        await api("/loan-requests", { method: "POST", body: JSON.stringify({ bookId: book.id }) });
        setMsg(`Solicitud enviada: ${book.title}`);
      } else {
        await api("/reservations", { method: "POST", body: JSON.stringify({ bookId: book.id }) });
        setMsg(`Reserva encolada: ${book.title}`);
      }
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <section>
      <div className="top">
        <div>
          <div className="eyebrow">Colección</div>
          <h2 style={{ margin: 0 }}>Catálogo</h2>
        </div>
      </div>
      <div className="searchbar">
        <input placeholder="Título, autor o ISBN" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => load()}>
          Buscar
        </button>
      </div>
      {msg && <p className="hint">{msg}</p>}
      <div className="grid">
        {books.map((book) => (
          <article className="card" key={book.id}>
            <h3>{book.title}</h3>
            <div className="meta">{book.authors.map((a) => a.fullName).join(", ")}</div>
            <div className="meta">{book.category?.name} · {book.isbn}</div>
            <div className="meta">Ubicación: {book.physicalLocation || "—"}</div>
            <div className="row">
              <span className={`pill ${book.availability.available ? "" : "warn"}`}>
                {book.availability.available}/{book.availability.total} disponibles
              </span>
            </div>
            {can("loans.request") && (
              <div className="row">
                <button className="btn" onClick={() => requestBook(book)}>
                  {book.availability.available ? "Solicitar" : "Reservar"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
