// Pagina "Atlete": tutti i membri approvati (atlete, staff, direzione) con
// foto e ruolo. Un tocco apre il profilo stile Facebook già esistente.
// Vedi supabase/members-directory.sql per la funzione che alimenta l'elenco.
import { useEffect, useMemo, useState } from "react";
import { Search, Shirt, Users, Send } from "lucide-react";
import { C, font, display, ringForRole } from "../theme";
import { supabase } from "../supabaseClient";
import { Card } from "../components/ui";
import { Avatar } from "../PersonalArea";
import { useMessagePerson } from "../profileLink";

const GRUPPI = [
  { key: "atlete", titolo: "Atlete", test: (m) => m.category === "atleta" },
  { key: "staff", titolo: "Staff tecnico", test: (m) => m.category === "staff" },
  { key: "direzione", titolo: "Direzione", test: (m) => m.category === "direzione" },
];

function MemberCard({ m, onOpen, mioUid }) {
  const scrivi = useMessagePerson();
  const ruolo = m.category === "atleta" ? (m.ruolo || "Atleta") : (m.ruolo || (m.role === "admin" ? "Amministrazione" : "Staff"));
  // Un <button> dentro un <button> non è HTML valido: la scheda è un div
  // cliccabile, così la scorciatoia al messaggio può starci dentro.
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(m.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(m.id); } }}
      title={`Apri il profilo di ${m.name || "questa persona"}`}
      style={{ ...font, display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
        background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "12px 14px",
        cursor: "pointer", color: C.ink, boxSizing: "border-box" }}>
      <Avatar url={m.avatar_url} name={m.name} size={48} ring={ringForRole(m.role, m.category)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.name || "—"} {m.flair && <span>{m.flair}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
          <span style={{ ...font, fontSize: 12, color: C.muted }}>{ruolo}</span>
          {m.jersey_number && (
            <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
              color: C.orange, background: C.orangeSoft, padding: "2px 8px", borderRadius: 99 }}>
              <Shirt size={11} /> {m.jersey_number}
            </span>
          )}
        </div>
      </div>
      {scrivi && m.category === "atleta" && m.id !== mioUid && (
        <button onClick={(e) => { e.stopPropagation(); scrivi(m.id, m.name || ""); }}
          aria-label={`Scrivi a ${m.name || "questa persona"}`} title="Messaggio privato"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            flexShrink: 0, borderRadius: 11, border: `1px solid ${C.grid}`, background: C.surface,
            color: C.navy2, cursor: "pointer" }}>
          <Send size={16} />
        </button>
      )}
    </div>
  );
}

export default function AtleteView({ onOpenCard, auth }) {
  const mioUid = auth?.uid || null;
  const [rows, setRows] = useState(null);       // null = caricamento
  const [unavailable, setUnavailable] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.rpc("members_directory").then(({ data, error }) => {
      if (error) { setUnavailable(true); setRows([]); return; }
      setRows(data || []);
    });
  }, []);

  const filtrati = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows || [];
    return (rows || []).filter((m) =>
      (m.name || "").toLowerCase().includes(t) || (m.ruolo || "").toLowerCase().includes(t));
  }, [rows, q]);

  if (unavailable) {
    return (
      <Card title="Elenco non disponibile" subtitle="Manca la funzione members_directory sul database.">
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>
          Esegui <b>supabase/members-directory.sql</b> nel SQL Editor, poi ricarica.
        </div>
      </Card>
    );
  }

  return (
    <Card title="La squadra" subtitle="Tocca una persona per aprire il suo profilo"
      id="a360-atlete">
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.surface,
        border: `1px solid ${C.grid}`, borderRadius: 12, padding: "0 13px", height: 46, marginBottom: 16 }}>
        <Search size={17} color={C.muted} style={{ flexShrink: 0 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o ruolo"
          style={{ ...font, fontSize: 15, color: C.ink, background: "transparent", border: "none",
            outline: "none", flexGrow: 1, minWidth: 0, alignSelf: "stretch" }} />
      </div>

      {rows === null ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Carico…</div>
      ) : filtrati.length === 0 ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={16} /> {q ? "Nessuno con questo nome." : "Ancora nessun membro approvato."}
        </div>
      ) : (
        GRUPPI.map(({ key, titolo, test }) => {
          const gruppo = filtrati.filter(test);
          if (gruppo.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: 22 }}>
              <div style={{ ...font, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                color: C.muted, marginBottom: 9 }}>
                {titolo} · {gruppo.length}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
                {gruppo.map((m) => <MemberCard key={m.id} m={m} onOpen={onOpenCard} mioUid={mioUid} />)}
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}
