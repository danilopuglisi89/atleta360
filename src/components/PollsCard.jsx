import { useState } from "react";
import { Vote, Plus, Trash2 } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { usePolls } from "../polls";

export default function PollsCard({ uid, isStaff }) {
  const { polls, votes, createPoll, vote, removePoll } = usePolls(uid);
  const [showNew, setShowNew] = useState(false);
  const [question, setQuestion] = useState("");
  const [opts, setOpts] = useState(["", ""]);

  if (!uid) return null;

  const submit = async () => {
    const options = opts.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) return;
    const err = await createPoll(question, options);
    if (!err) { setShowNew(false); setQuestion(""); setOpts(["", ""]); }
  };

  return (
    <Card title="Sondaggi" subtitle="Vota o crea un sondaggio veloce per la squadra" style={{ marginTop: 16 }} className="a360-noprint">
      <button onClick={() => setShowNew((v) => !v)}
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 13px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        <Plus size={14} /> {showNew ? "Chiudi" : "Nuovo sondaggio"}
      </button>

      {showNew && (
        <div style={{ border: `1px dashed ${C.grid}`, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Domanda (es. Pizzata venerdì?)"
            style={{ ...font, fontSize: 13.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "8px 11px" }} />
          {opts.map((o, i) => (
            <input key={i} value={o} onChange={(e) => setOpts((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`Opzione ${i + 1}`} style={{ ...font, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "7px 10px" }} />
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {opts.length < 4 && <button onClick={() => setOpts((a) => [...a, ""])} style={{ ...font, fontSize: 12, color: C.navy2, background: "none", border: "none", cursor: "pointer" }}>+ opzione</button>}
            <button onClick={submit} style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 8, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>Pubblica</button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessun sondaggio attivo.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {polls.map((p) => {
            const pv = votes.filter((v) => v.poll_id === p.id);
            const total = pv.length || 1;
            const myVote = pv.find((v) => v.user_id === uid)?.option_index;
            return (
              <div key={p.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Vote size={14} color={C.orange} />
                  <span style={{ ...display, fontSize: 14, fontWeight: 700, color: C.ink, flex: 1 }}>{p.question}</span>
                  {(p.created_by === uid || isStaff) && (
                    <button onClick={() => removePoll(p.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><Trash2 size={13} /></button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {p.options.map((opt, i) => {
                    const n = pv.filter((v) => v.option_index === i).length;
                    const pct = Math.round((n / total) * 100);
                    return (
                      <button key={i} onClick={() => vote(p.id, i)}
                        style={{ position: "relative", textAlign: "left", ...font, fontSize: 12.5, padding: "8px 11px", borderRadius: 9, cursor: "pointer", overflow: "hidden",
                          border: `1px solid ${myVote === i ? C.orange : C.grid}`, background: C.card }}>
                        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: myVote === i ? C.orangeSoft : C.surface, zIndex: 0 }} />
                        <span style={{ position: "relative", zIndex: 1, color: C.ink, fontWeight: myVote === i ? 700 : 500 }}>{opt} — {pct}% ({n})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
