import { useEffect, useState, useCallback } from "react";
import { Check, X, Clock, RotateCcw, Plus, Trash2, ArrowUp, ArrowDown, Power, Save } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";
import { Avatar } from "./PersonalArea";

const STATUS_META = {
  pending: { label: "In attesa", color: "#B4520A", bg: "#FFE9D5" },
  approved: { label: "Approvata", color: "#0F7A4E", bg: "#DDF3E7" },
  rejected: { label: "Rifiutata", color: "#B4232A", bg: "#FDECEC" },
};
const CATEGORY_LABEL = { direzione: "Direzione", staff: "Staff", atleta: "Atleta" };

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

const inp = { ...font, fontSize: 13.5, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 10px", outline: "none" };
const iconBtn = (color) => ({ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.grid}`, background: "#fff", color, cursor: "pointer" });

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "focus";
}

export default function AdminPanel({ onChange }) {
  const [rows, setRows] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [newAthlete, setNewAthlete] = useState("");
  const [newSkill, setNewSkill] = useState({ title: "", short: "", description: "" });
  const [detail, setDetail] = useState(null);   // scheda utente aperta
  const [dform, setDform] = useState({});

  const load = useCallback(async () => {
    const [p, a, s] = await Promise.all([
      supabase.from("profiles").select("*").neq("role", "admin").order("created_at", { ascending: false }),
      supabase.from("athletes").select("*").order("identifier", { ascending: true }),
      supabase.from("skills").select("*").order("sort_order", { ascending: true }),
    ]);
    if (p.error || a.error || s.error) { setError((p.error || a.error || s.error).message); return; }
    setRows(p.data || []); setAthletes(a.data || []); setSkills(s.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const after = async () => { await load(); onChange && onChange(); };
  const guard = async (fn) => { setError(null); const { error } = await fn(); if (error) { setError(error.message); return false; } await after(); return true; };

  // --- richieste / iscritti ---
  const setStatus = (id, status) => guard(() => supabase.from("profiles").update({ status }).eq("id", id));
  const setCategory = (id, category) => guard(() => supabase.from("profiles").update({ category }).eq("id", id));
  const setAthleteLink = (id, athlete_id) => guard(() => supabase.from("profiles").update({ athlete_id: athlete_id || null }).eq("id", id));
  const setAssess = (id, can_assess) => guard(() => supabase.from("profiles").update({ can_assess }).eq("id", id));
  const delUser = async (r) => {
    if (!window.confirm(`Eliminare DEFINITIVAMENTE l'account di ${fullName(r)}? L'operazione non è reversibile.`)) return;
    setError(null);
    const { error } = await supabase.rpc("admin_delete_user", { target: r.id });
    if (error) { setError(error.message); return; }
    await after();
  };

  const openDetail = (r) => {
    setDetail(r);
    setDform({
      first_name: r.first_name || "", last_name: r.last_name || "", category: r.category || "atleta",
      status: r.status, can_assess: !!r.can_assess, athlete_id: r.athlete_id || "",
      phone: r.phone || "", facebook: r.facebook || "", instagram: r.instagram || "",
      jersey_number: r.jersey_number || "", ruolo: r.ruolo || "",
    });
  };
  const df = (k) => (e) => setDform((v) => ({ ...v, [k]: e.target.value }));
  const saveDetail = async () => {
    const { error } = await supabase.from("profiles").update({
      first_name: dform.first_name.trim() || null, last_name: dform.last_name.trim() || null,
      category: dform.category, status: dform.status, can_assess: dform.can_assess,
      athlete_id: dform.athlete_id || null, phone: dform.phone.trim() || null,
      facebook: dform.facebook.trim() || null, instagram: dform.instagram.trim() || null,
      jersey_number: dform.jersey_number.trim() || null, ruolo: dform.ruolo.trim() || null,
    }).eq("id", detail.id);
    if (error) { setError(error.message); return; }
    setDetail(null);
    await after();
  };

  // --- atlete ---
  const addAthlete = async () => {
    const id = newAthlete.trim(); if (!id) return;
    if (await guard(() => supabase.from("athletes").insert({ identifier: id }))) setNewAthlete("");
  };
  const renameAthlete = (a, identifier) => { const v = identifier.trim(); if (v && v !== a.identifier) guard(() => supabase.from("athletes").update({ identifier: v }).eq("id", a.id)); };
  const setPosition = (a, position) => { const v = position.trim(); if (v !== (a.position || "")) guard(() => supabase.from("athletes").update({ position: v || null }).eq("id", a.id)); };
  const toggleAthlete = (a) => guard(() => supabase.from("athletes").update({ active: !a.active }).eq("id", a.id));
  const delAthlete = (a) => { if (window.confirm(`Eliminare "${a.identifier}"? Verranno rimossi anche i suoi rilevamenti.`)) guard(() => supabase.from("athletes").delete().eq("id", a.id)); };

  // --- focus ---
  const addSkill = async () => {
    const title = newSkill.title.trim(); if (!title) return;
    const key = slugify(title);
    const sort_order = (skills.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0)) + 1;
    if (await guard(() => supabase.from("skills").insert({ key, title, short: newSkill.short.trim() || title.slice(0, 10), description: newSkill.description.trim() || null, sort_order })))
      setNewSkill({ title: "", short: "", description: "" });
  };
  const updateSkill = (s, patch) => guard(() => supabase.from("skills").update(patch).eq("id", s.id));
  const toggleSkill = (s) => guard(() => supabase.from("skills").update({ active: !s.active }).eq("id", s.id));
  const delSkill = (s) => { if (window.confirm(`Eliminare il focus "${s.title}"?`)) guard(() => supabase.from("skills").delete().eq("id", s.id)); };
  const moveSkill = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= skills.length) return;
    const a = skills[i], b = skills[j];
    setError(null);
    await supabase.from("skills").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("skills").update({ sort_order: a.sort_order }).eq("id", b.id);
    await after();
  };

  if (error) return <Card title="Errore"><span style={{ ...font, fontSize: 14, color: "#B4232A" }}>{error}</span></Card>;
  if (!rows) return <Card title="Carico…" />;

  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");
  const athleteOptions = athletes.filter((a) => a.active).map((a) => a.identifier);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* RICHIESTE IN ATTESA */}
      <Card title="Richieste in attesa" subtitle={pending.length ? `${pending.length} da valutare` : "Nessuna richiesta in attesa"}>
        {pending.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}><Clock size={16} /> Tutto in pari.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", border: `1px solid ${C.grid}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span onClick={() => openDetail(r)} title="Apri scheda" style={{ ...font, fontSize: 14.5, color: C.navy2, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textDecorationColor: C.grid }}>{fullName(r)}</span>
                    <span style={{ ...font, fontSize: 11.5, fontWeight: 600, color: C.navy2, background: C.surface, border: `1px solid ${C.grid}`, padding: "3px 9px", borderRadius: 99 }}>{CATEGORY_LABEL[r.category] || "Atleta"}</span>
                  </div>
                  <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{r.email} · {fmtDate(r.created_at)}</div>
                </div>
                <button onClick={() => setAssess(r.id, !r.can_assess)} title="Permesso di inserire rilevamenti (mister)"
                  style={{ ...font, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 99, cursor: "pointer",
                    border: `1px solid ${r.can_assess ? "#0F7A4E" : C.grid}`, background: r.can_assess ? "#DDF3E7" : "#fff", color: r.can_assess ? "#0F7A4E" : C.muted }}>
                  {r.can_assess ? "✓ Rilevamenti" : "Rilevamenti"}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setStatus(r.id, "approved")} style={btn("#0F7A4E")}><Check size={16} /> Approva</button>
                  <button onClick={() => setStatus(r.id, "rejected")} style={btn("#B4232A", true)}><X size={16} /> Rifiuta</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ISCRITTI */}
      <Card title="Iscritti" subtitle="Ruolo, collegamento all'atleta e stato dell'accesso">
        {decided.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Ancora nessun iscritto gestito.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decided.map((r) => {
              const s = STATUS_META[r.status];
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${C.grid}`, padding: "10px 2px" }}>
                  <div style={{ flex: "1 1 170px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span onClick={() => openDetail(r)} title="Apri scheda" style={{ ...font, fontSize: 14, color: C.navy2, cursor: "pointer", textDecoration: "underline", textDecorationColor: C.grid }}>{fullName(r)}</span>
                      {r.status === "approved" && r.category === "atleta" && !r.athlete_id && (
                        <span title="Collega questa atleta a una scheda, altrimenti non vedrà il suo profilo" style={{ ...font, fontSize: 11, fontWeight: 600, color: "#B4520A", background: "#FFE9D5", padding: "2px 8px", borderRadius: 99 }}>⚠️ da collegare</span>
                      )}
                    </div>
                    <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 2 }}>{r.email}</div>
                  </div>
                  <select value={r.category || "atleta"} onChange={(e) => setCategory(r.id, e.target.value)} style={{ ...inp, cursor: "pointer", fontSize: 12.5 }}>
                    <option value="atleta">Atleta</option><option value="staff">Staff</option><option value="direzione">Direzione</option>
                  </select>
                  <select value={r.athlete_id || ""} onChange={(e) => setAthleteLink(r.id, e.target.value)} title="Collega alla scheda atleta"
                    style={{ ...inp, cursor: "pointer", fontSize: 12.5, color: r.athlete_id ? C.ink : C.muted, maxWidth: 150 }}>
                    <option value="">Atleta: —</option>
                    {athleteOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button onClick={() => setAssess(r.id, !r.can_assess)} title="Permesso di inserire rilevamenti (mister)"
                    style={{ ...font, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 99, cursor: "pointer",
                      border: `1px solid ${r.can_assess ? "#0F7A4E" : C.grid}`, background: r.can_assess ? "#DDF3E7" : "#fff", color: r.can_assess ? "#0F7A4E" : C.muted }}>
                    {r.can_assess ? "✓ Rilevamenti" : "Rilevamenti"}
                  </button>
                  <span style={{ ...font, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, padding: "4px 10px", borderRadius: 99 }}>{s.label}</span>
                  <button onClick={() => setStatus(r.id, r.status === "approved" ? "rejected" : "approved")} style={{ ...font, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "6px 10px", color: C.muted, cursor: "pointer" }}>
                    <RotateCcw size={13} /> {r.status === "approved" ? "Revoca" : "Approva"}
                  </button>
                  {r.status === "rejected" && (
                    <button onClick={() => delUser(r)} title="Elimina definitivamente l'account" style={iconBtn("#B4232A")}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ATLETE */}
      <Card title="Atlete" subtitle="La rosa: aggiungi, rinomina o disattiva le atlete">
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={newAthlete} onChange={(e) => setNewAthlete(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAthlete()}
            placeholder="Nuova atleta (es. Beatrice V.)" style={{ ...inp, flex: "1 1 220px" }} />
          <button onClick={addAthlete} style={btn(C.orange === "#FF7A18" ? "#0F7A4E" : "#0F7A4E")}><Plus size={16} /> Aggiungi</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {athletes.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${C.grid}`, padding: "8px 2px", opacity: a.active ? 1 : 0.55 }}>
              <input defaultValue={a.identifier} onBlur={(e) => renameAthlete(a, e.target.value)} style={{ ...inp, flex: "1 1 160px" }} />
              <input defaultValue={a.position || ""} onBlur={(e) => setPosition(a, e.target.value)} placeholder="Ruolo in campo" style={{ ...inp, flex: "1 1 140px", fontSize: 12.5 }} />
              <span style={{ ...font, fontSize: 12, color: a.active ? "#0F7A4E" : C.muted }}>{a.active ? "attiva" : "disattivata"}</span>
              <button onClick={() => toggleAthlete(a)} title={a.active ? "Disattiva" : "Riattiva"} style={iconBtn(C.muted)}><Power size={15} /></button>
              <button onClick={() => delAthlete(a)} title="Elimina" style={iconBtn("#B4232A")}><Trash2 size={15} /></button>
            </div>
          ))}
          {athletes.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessuna atleta. Aggiungine una qui sopra.</div>}
        </div>
      </Card>

      {/* FOCUS */}
      <Card title="Focus (competenze)" subtitle="Le competenze allenate: aggiungi, rinomina, riordina o disattiva">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, background: C.surface, borderRadius: 12, padding: 14 }}>
          <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.ink }}>Nuovo focus</div>
          <input value={newSkill.title} onChange={(e) => setNewSkill((v) => ({ ...v, title: e.target.value }))} placeholder="Titolo (es. Spirito di Squadra)" style={inp} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={newSkill.short} onChange={(e) => setNewSkill((v) => ({ ...v, short: e.target.value }))} placeholder="Etichetta breve (grafici, es. Squadra)" style={{ ...inp, flex: "1 1 180px" }} />
          </div>
          <input value={newSkill.description} onChange={(e) => setNewSkill((v) => ({ ...v, description: e.target.value }))} placeholder="Descrizione (facoltativa)" style={inp} />
          <button onClick={addSkill} style={{ ...btn("#0F7A4E"), alignSelf: "flex-start" }}><Plus size={16} /> Aggiungi focus</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {skills.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${C.grid}`, padding: "8px 2px", opacity: s.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 260px" }}>
                <input defaultValue={s.title} onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && updateSkill(s, { title: e.target.value.trim() })} style={inp} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input defaultValue={s.short} onBlur={(e) => e.target.value.trim() && e.target.value !== s.short && updateSkill(s, { short: e.target.value.trim() })} placeholder="breve" style={{ ...inp, width: 120, fontSize: 12.5 }} />
                  <input defaultValue={s.description || ""} onBlur={(e) => e.target.value !== (s.description || "") && updateSkill(s, { description: e.target.value.trim() || null })} placeholder="descrizione" style={{ ...inp, flex: "1 1 160px", fontSize: 12.5 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => moveSkill(i, -1)} disabled={i === 0} title="Su" style={{ ...iconBtn(C.muted), opacity: i === 0 ? 0.4 : 1 }}><ArrowUp size={15} /></button>
                <button onClick={() => moveSkill(i, 1)} disabled={i === skills.length - 1} title="Giù" style={{ ...iconBtn(C.muted), opacity: i === skills.length - 1 ? 0.4 : 1 }}><ArrowDown size={15} /></button>
                <button onClick={() => toggleSkill(s)} title={s.active ? "Disattiva" : "Riattiva"} style={iconBtn(C.muted)}><Power size={15} /></button>
                <button onClick={() => delSkill(s)} title="Elimina" style={iconBtn("#B4232A")}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {skills.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessun focus. Aggiungine uno qui sopra.</div>}
        </div>
      </Card>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,19,48,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <Avatar url={detail.avatar_url} name={fullName(detail)} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>{fullName(detail)}</div>
                <div style={{ ...font, fontSize: 12.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.email}</div>
              </div>
              <button onClick={() => setDetail(null)} style={iconBtn(C.muted)}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <L label="Nome"><input value={dform.first_name} onChange={df("first_name")} style={inp} /></L>
              <L label="Cognome"><input value={dform.last_name} onChange={df("last_name")} style={inp} /></L>
              <L label="Categoria"><select value={dform.category} onChange={df("category")} style={{ ...inp, cursor: "pointer" }}><option value="atleta">Atleta</option><option value="staff">Staff</option><option value="direzione">Direzione</option></select></L>
              <L label="Stato"><select value={dform.status} onChange={df("status")} style={{ ...inp, cursor: "pointer" }}><option value="pending">In attesa</option><option value="approved">Approvata</option><option value="rejected">Rifiutata</option></select></L>
              <L label="Collega ad atleta"><select value={dform.athlete_id} onChange={df("athlete_id")} style={{ ...inp, cursor: "pointer" }}><option value="">—</option>{athleteOptions.map((a) => <option key={a} value={a}>{a}</option>)}</select></L>
              <L label="Permesso rilevamenti"><button type="button" onClick={() => setDform((v) => ({ ...v, can_assess: !v.can_assess }))} style={{ ...inp, cursor: "pointer", textAlign: "left", fontWeight: 600, color: dform.can_assess ? "#0F7A4E" : C.muted }}>{dform.can_assess ? "✓ Abilitato" : "Non abilitato"}</button></L>
              <L label="Telefono"><input value={dform.phone} onChange={df("phone")} style={inp} /></L>
              <L label="Numero di maglia"><input value={dform.jersey_number} onChange={df("jersey_number")} style={inp} /></L>
              <L label="Ruolo in campo"><input value={dform.ruolo} onChange={df("ruolo")} style={inp} /></L>
              <L label="Facebook"><input value={dform.facebook} onChange={df("facebook")} style={inp} /></L>
              <L label="Instagram"><input value={dform.instagram} onChange={df("instagram")} style={inp} /></L>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={saveDetail} style={btn(C.orange)}><Save size={16} /> Salva</button>
              <button onClick={() => setDetail(null)} style={{ ...font, padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, cursor: "pointer", fontSize: 13 }}>Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <div>
      <label style={{ ...font, fontSize: 11.5, color: C.muted, fontWeight: 500, marginBottom: 4, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

const btn = (color, outline = false) => ({
  ...font, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, cursor: "pointer",
  border: outline ? `1.5px solid ${color}` : "none", background: outline ? "#fff" : color, color: outline ? color : "#fff",
});

function fullName(r) {
  const n = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return n || "(senza nome)";
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
