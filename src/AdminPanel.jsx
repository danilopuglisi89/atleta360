import { useEffect, useState, useCallback } from "react";
import { Check, X, Clock, RotateCcw } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";

const STATUS_META = {
  pending: { label: "In attesa", color: "#B4520A", bg: "#FFE9D5" },
  approved: { label: "Approvata", color: "#0F7A4E", bg: "#DDF3E7" },
  rejected: { label: "Rifiutata", color: "#B4232A", bg: "#FDECEC" },
};

const CATEGORY_LABEL = { direzione: "Direzione", staff: "Staff", atleta: "Atleta" };

function CategoryTag({ value }) {
  return (
    <span style={{ ...font, fontSize: 11.5, fontWeight: 600, color: C.navy2, background: C.surface,
      border: `1px solid ${C.grid}`, padding: "3px 9px", borderRadius: 99 }}>
      {CATEGORY_LABEL[value] || "Atleta"}
    </span>
  );
}

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, boxShadow: "0 1px 2px rgba(12,19,48,0.04)", padding: 20, ...style }}>
      {title && <h3 style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>}
      {subtitle && <p style={{ ...font, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
      {(title || subtitle) && <div style={{ height: 16 }} />}
      {children}
    </div>
  );
}

export default function AdminPanel() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: false });
    if (error) { setError(error.message); return; }
    setRows(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) { setError(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const setCategory = async (id, category) => {
    setBusyId(id);
    const { error } = await supabase.from("profiles").update({ category }).eq("id", id);
    setBusyId(null);
    if (error) { setError(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, category } : r)));
  };

  if (error) {
    return <Card title="Errore"><span style={{ ...font, fontSize: 14, color: "#B4232A" }}>{error}</span></Card>;
  }
  if (!rows) {
    return <Card title="Carico le richieste…" />;
  }

  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="Richieste in attesa" subtitle={pending.length ? `${pending.length} da valutare` : "Nessuna richiesta in attesa"}>
        {pending.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={16} /> Tutto in pari. Le nuove richieste compaiono qui.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                border: `1px solid ${C.grid}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ ...font, fontSize: 14.5, color: C.ink, fontWeight: 600 }}>{fullName(r)}</span>
                    <CategoryTag value={r.category} />
                  </div>
                  <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{r.email} · {fmtDate(r.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setStatus(r.id, "approved")} disabled={busyId === r.id} style={btn("#0F7A4E")}>
                    <Check size={16} /> Approva
                  </button>
                  <button onClick={() => setStatus(r.id, "rejected")} disabled={busyId === r.id} style={btn("#B4232A", true)}>
                    <X size={16} /> Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Iscritti" subtitle="Cambia ruolo, revoca o ripristina l'accesso in qualsiasi momento">
        {decided.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Ancora nessun iscritto gestito.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decided.map((r) => {
              const s = STATUS_META[r.status];
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  borderBottom: `1px solid ${C.grid}`, padding: "10px 2px" }}>
                  <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                    <div style={{ ...font, fontSize: 14, color: C.ink }}>{fullName(r)}</div>
                    <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 2 }}>{r.email}</div>
                  </div>
                  <select value={r.category || "atleta"} onChange={(e) => setCategory(r.id, e.target.value)} disabled={busyId === r.id}
                    style={{ ...font, fontSize: 12.5, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "6px 9px", cursor: "pointer" }}>
                    <option value="atleta">Atleta</option>
                    <option value="staff">Staff</option>
                    <option value="direzione">Direzione</option>
                  </select>
                  <span style={{ ...font, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, padding: "4px 10px", borderRadius: 99 }}>{s.label}</span>
                  <button
                    onClick={() => setStatus(r.id, r.status === "approved" ? "rejected" : "approved")}
                    disabled={busyId === r.id}
                    style={{ ...font, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5,
                      background: "none", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "6px 10px",
                      color: C.muted, cursor: "pointer" }}>
                    <RotateCcw size={13} /> {r.status === "approved" ? "Revoca" : "Approva"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

const btn = (color, outline = false) => ({
  ...font, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 13px", borderRadius: 10, cursor: "pointer",
  border: outline ? `1.5px solid ${color}` : "none",
  background: outline ? "#fff" : color,
  color: outline ? color : "#fff",
});

function fullName(r) {
  const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return n || "(senza nome)";
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
