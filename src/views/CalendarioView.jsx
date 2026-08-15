// Calendario: prossimi impegni (partite/allenamenti) con conferma presenza,
// luogo cliccabile su Google Maps, risultati; per lo staff anche gestione
// eventi e routine settimanali. Dati: src/calendar.js + supabase/calendar.sql.
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus, Trash2, CheckCircle2, XCircle, Repeat, Trophy, Ban, Download } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "../components/ui";
import { supabase } from "../supabaseClient";
import { useCalendar } from "../calendar";
import { downloadEventICS } from "../ics";
import { ShareButton } from "../components/ShareSheet";
import { useMatchWords } from "../rituals";

const WEEKDAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const KIND_LABEL = { match: "Partita", training: "Allenamento", other: "Evento" };
const KIND_COLOR = { match: "#B4232A", training: C.navy2, other: "#0F7A4E" };

const fmtDay = (iso) => new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const mapsUrl = (loc) => `https://maps.google.com/?q=${encodeURIComponent(loc)}`;

function KindBadge({ kind }) {
  return (
    <span style={{ ...font, fontSize: 11, fontWeight: 700, color: "#fff", background: KIND_COLOR[kind] || C.muted, borderRadius: 7, padding: "3px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
      {KIND_LABEL[kind] || kind}
    </span>
  );
}

function EventCard({ ev, myRsvp, counts, names, isStaff, uid, onRsvp, onResult, onCancel, onDelete }) {
  const [resultDraft, setResultDraft] = useState("");
  const past = new Date(ev.starts_at) < new Date();
  // "La parola della partita": 24h di finestra dopo il risultato per
  // lasciare una parola/emoji — hook sempre chiamato, attivo solo quando serve.
  const words = useMatchWords(ev.result ? ev.id : null, uid);
  const [wordDraft, setWordDraft] = useState("");
  const hoursSinceResult = ev.result ? (new Date() - new Date(ev.starts_at)) / 3600e3 : null;
  const wordsOpen = ev.result && hoursSinceResult >= 0 && hoursSinceResult <= 24;

  return (
    <div style={{ border: `1px solid ${C.grid}`, borderRadius: 14, padding: "14px 16px", background: ev.cancelled ? "#FAFAFC" : C.card, opacity: ev.cancelled ? 0.65 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <KindBadge kind={ev.kind} />
        {ev.title && <span style={{ ...display, fontSize: 15, fontWeight: 700, color: C.ink }}>{ev.title}</span>}
        {ev.cancelled && <span style={{ ...font, fontSize: 12, fontWeight: 700, color: "#B4232A" }}>ANNULLATO</span>}
        {ev.result && (
          <span style={{ ...display, fontSize: 13, fontWeight: 700, color: "#0F7A4E", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Trophy size={14} /> {ev.result}
          </span>
        )}
        {ev.result && !ev.cancelled && (
          <ShareButton kind="match" label="Condividi" variant="ghost"
            style={{ padding: "5px 10px", fontSize: 12 }}
            data={{
              title: ev.title || (ev.kind === "match" ? "Partita" : "Evento"),
              result: ev.result,
              dateLabel: fmtDay(ev.starts_at),
              location: ev.location || "",
            }} />
        )}
      </div>
      <div style={{ ...font, fontSize: 13.5, color: C.ink, marginTop: 7, textTransform: "capitalize" }}>
        {fmtDay(ev.starts_at)} · <b>{fmtTime(ev.starts_at)}</b>{ev.ends_at ? `–${fmtTime(ev.ends_at)}` : ""}
      </div>
      {ev.location && (
        <a href={mapsUrl(ev.location)} target="_blank" rel="noreferrer"
          style={{ ...font, fontSize: 13, color: C.navy2, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, textDecoration: "none", fontWeight: 600 }}>
          <MapPin size={14} /> {ev.location}
        </a>
      )}
      {ev.notes && <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 5 }}>{ev.notes}</div>}

      {wordsOpen && uid && (
        <div style={{ background: C.surface, borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
          <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Com'è andata? Lascia una parola (24h dalla partita)</div>
          {words.mine ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {words.rows.map((w, i) => (
                <span key={i} style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 99, padding: "4px 10px" }}>{w.word}</span>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <input value={wordDraft} onChange={(e) => setWordDraft(e.target.value)} placeholder="una parola o un'emoji" maxLength={24}
                style={{ ...font, fontSize: 12.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "6px 10px", flex: 1 }} />
              <button onClick={() => { words.send(wordDraft); setWordDraft(""); }}
                style={{ ...font, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
                Invia
              </button>
            </div>
          )}
        </div>
      )}
      {(ev.objective || ev.exercises) && (
        <div style={{ background: C.surface, borderRadius: 10, padding: "9px 12px", marginTop: 8 }}>
          {ev.objective && <div style={{ ...font, fontSize: 12.5, color: C.ink }}><b>Obiettivo:</b> {ev.objective}</div>}
          {ev.exercises && <div style={{ ...font, fontSize: 12.5, color: C.ink, marginTop: ev.objective ? 4 : 0 }}><b>Esercizi:</b> {ev.exercises}</div>}
        </div>
      )}

      {/* Conferma presenza (solo eventi futuri non annullati) */}
      {!past && !ev.cancelled && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => onRsvp(ev.id, "yes")}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${myRsvp === "yes" ? "#0F7A4E" : C.grid}`, background: myRsvp === "yes" ? "#DDF3E7" : C.card, color: myRsvp === "yes" ? "#0F7A4E" : C.muted }}>
            <CheckCircle2 size={14} /> Ci sarò
          </button>
          <button onClick={() => onRsvp(ev.id, "no")}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer",
              border: `1px solid ${myRsvp === "no" ? "#B4232A" : C.grid}`, background: myRsvp === "no" ? "#FDECEC" : C.card, color: myRsvp === "no" ? "#B4232A" : C.muted }}>
            <XCircle size={14} /> Non ci sarò
          </button>
          <span style={{ ...font, fontSize: 12, color: C.muted }}>
            {counts.yes} conferm{counts.yes === 1 ? "a" : "e"}{counts.no > 0 ? ` · ${counts.no} assenz${counts.no === 1 ? "a" : "e"}` : ""}
          </span>
          <button onClick={() => downloadEventICS(ev, "Oasi · ")} title="Aggiungi al calendario del telefono"
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, cursor: "pointer" }}>
            <Download size={12} /> Al calendario
          </button>
        </div>
      )}
      {isStaff && !past && !ev.cancelled && names.yes.length + names.no.length > 0 && (
        <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          {names.yes.length > 0 && <span>✓ {names.yes.join(", ")}</span>}
          {names.no.length > 0 && <span style={{ display: "block" }}>✗ {names.no.join(", ")}</span>}
        </div>
      )}

      {/* Strumenti staff */}
      {isStaff && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {past && ev.kind === "match" && !ev.cancelled && (
            <>
              <input value={resultDraft} onChange={(e) => setResultDraft(e.target.value)} placeholder={ev.result ? `Risultato: ${ev.result}` : "Risultato (es. 3-1)"}
                style={{ ...font, fontSize: 12.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "6px 10px", width: 130, outline: "none" }} />
              <button onClick={() => { if (resultDraft.trim()) { onResult(ev.id, resultDraft.trim()); setResultDraft(""); } }}
                style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
                Salva
              </button>
            </>
          )}
          {!past && !ev.cancelled && (
            <button onClick={() => onCancel(ev.id)} title="Annulla evento"
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.grid}`, background: C.card, color: "#B4232A", cursor: "pointer" }}>
              <Ban size={13} /> Annulla
            </button>
          )}
          <button onClick={() => onDelete(ev.id)} title="Elimina"
            style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarioView({ auth }) {
  const uid = auth?.uid;
  const isStaff = !!auth?.isStaff;
  const cal = useCalendar(uid);
  const [people, setPeople] = useState({});      // user_id -> nome (per i nomi delle conferme, staff)
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kind: "match", title: "", date: "", time: "", endTime: "", location: "", notes: "", objective: "", exercises: "" });
  const [recForm, setRecForm] = useState({ weekday: 2, start: "18:00", end: "20:00", location: "" });
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!isStaff) return;
    supabase.from("profiles").select("id, first_name, last_name").eq("status", "approved").then(({ data }) => {
      const map = {};
      (data || []).forEach((p) => { map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "?"; });
      setPeople(map);
    });
  }, [isStaff]);

  const now = new Date();
  const upcoming = useMemo(() => (cal.events || []).filter((e) => new Date(e.starts_at) >= now), [cal.events]);   // eslint-disable-line
  const past = useMemo(() => (cal.events || []).filter((e) => new Date(e.starts_at) < now).reverse().slice(0, 10), [cal.events]);  // eslint-disable-line

  const rsvpFor = (evId) => cal.rsvps.filter((r) => r.event_id === evId);
  const cardProps = (ev) => {
    const rs = rsvpFor(ev.id);
    return {
      ev,
      myRsvp: rs.find((r) => r.user_id === uid)?.status || null,
      counts: { yes: rs.filter((r) => r.status === "yes").length, no: rs.filter((r) => r.status === "no").length },
      names: {
        yes: rs.filter((r) => r.status === "yes").map((r) => people[r.user_id]).filter(Boolean),
        no: rs.filter((r) => r.status === "no").map((r) => people[r.user_id]).filter(Boolean),
      },
      isStaff,
      uid,
      onRsvp: async (id, s) => setErr(await cal.setRsvp(id, s)),
      onResult: async (id, result) => setErr(await cal.updateEvent(id, { result })),
      onCancel: async (id) => { if (window.confirm("Annullare questo evento? Resta in elenco come annullato.")) setErr(await cal.updateEvent(id, { cancelled: true })); },
      onDelete: async (id) => { if (window.confirm("Eliminare definitivamente questo evento?")) setErr(await cal.removeEvent(id)); },
    };
  };

  const submitEvent = async () => {
    if (!form.date || !form.time) { setErr("Data e ora sono obbligatorie."); return; }
    const starts = new Date(`${form.date}T${form.time}`);
    const ends = form.endTime ? new Date(`${form.date}T${form.endTime}`) : null;
    const e = await cal.addEvent({
      kind: form.kind,
      title: form.title.trim() || null,
      starts_at: starts.toISOString(),
      ends_at: ends ? ends.toISOString() : null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      objective: form.objective.trim() || null,
      exercises: form.exercises.trim() || null,
    });
    setErr(e);
    if (!e) { setShowAdd(false); setForm({ kind: "match", title: "", date: "", time: "", endTime: "", location: "", notes: "", objective: "", exercises: "" }); }
  };

  const submitRecurrence = async () => {
    const e = await cal.addRecurrence({
      kind: "training",
      weekday: Number(recForm.weekday),
      start_time: recForm.start,
      end_time: recForm.end || null,
      location: recForm.location.trim() || null,
    });
    setErr(e);
  };

  const inputStyle = { ...font, fontSize: 13.5, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 11px", outline: "none", boxSizing: "border-box" };

  if (cal.events === null) return <Card title="Carico il calendario…" />;
  if (cal.error) return <Card title="Calendario non disponibile" subtitle={`Va prima eseguito supabase/calendar.sql (${cal.error})`} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ---------- Prossimi impegni ---------- */}
      <Card title="Prossimi impegni" subtitle={upcoming.length ? `${upcoming.length} in programma` : "Niente in programma al momento"}>
        {isStaff && (
          <button onClick={() => setShowAdd((v) => !v)} className="a360-noprint"
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "9px 14px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={15} /> {showAdd ? "Chiudi" : "Aggiungi evento"}
          </button>
        )}

        {isStaff && showAdd && (
          <div style={{ border: `1px dashed ${C.grid}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="match">Partita</option>
                <option value="training">Allenamento</option>
                <option value="other">Altro</option>
              </select>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={form.kind === "match" ? "Avversario (es. vs Pescia)" : "Titolo (facoltativo)"} style={{ ...inputStyle, flex: "1 1 180px" }} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} style={inputStyle} />
              <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} title="Fine (facoltativa)" style={inputStyle} />
            </div>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Luogo (es. Pardini Sporting Center, Lido di Camaiore)" style={inputStyle} />
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Note (es. ritrovo 30 minuti prima)" style={inputStyle} />
            {form.kind === "training" && (
              <>
                <input value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Obiettivo della seduta (es. lavoro sulla comunicazione in ricezione)" style={inputStyle} />
                <input value={form.exercises} onChange={(e) => setForm((f) => ({ ...f, exercises: e.target.value }))} placeholder="Esercizi (facoltativo)" style={inputStyle} />
              </>
            )}
            <button onClick={submitEvent}
              style={{ ...font, alignSelf: "flex-start", padding: "10px 16px", borderRadius: 10, border: "none", background: "#0F7A4E", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              Salva evento
            </button>
          </div>
        )}

        {err && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginBottom: 10 }}>{err}</div>}

        {upcoming.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Quando lo staff aggiunge partite e allenamenti, li trovi qui — con promemoria push la sera prima.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map((ev) => <EventCard key={ev.id} {...cardProps(ev)} />)}
          </div>
        )}
      </Card>

      {/* ---------- Routine settimanale (solo staff) ---------- */}
      {isStaff && (
        <Card title="Routine settimanale" subtitle="Gli allenamenti fissi: si ripetono da soli per le prossime 5 settimane" className="a360-noprint">
          {cal.recurrences.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {cal.recurrences.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${C.grid}`, padding: "8px 2px" }}>
                  <Repeat size={14} color={r.active ? C.navy2 : C.muted} />
                  <span style={{ ...font, fontSize: 13.5, color: r.active ? C.ink : C.muted, flex: 1 }}>
                    <b>{WEEKDAYS[r.weekday]}</b> {String(r.start_time).slice(0, 5)}{r.end_time ? `–${String(r.end_time).slice(0, 5)}` : ""}{r.location ? ` · ${r.location}` : ""}
                    {!r.active && " (in pausa)"}
                  </span>
                  <button onClick={() => cal.updateRecurrence(r.id, { active: !r.active })}
                    style={{ ...font, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.grid}`, background: C.card, color: r.active ? C.muted : "#0F7A4E", cursor: "pointer" }}>
                    {r.active ? "Metti in pausa" : "Riattiva"}
                  </button>
                  <button onClick={() => { if (window.confirm("Eliminare la routine e i suoi allenamenti futuri?")) cal.removeRecurrence(r.id); }}
                    style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.grid}`, background: C.card, color: "#B4232A", cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={recForm.weekday} onChange={(e) => setRecForm((f) => ({ ...f, weekday: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
              {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
            <input type="time" value={recForm.start} onChange={(e) => setRecForm((f) => ({ ...f, start: e.target.value }))} style={inputStyle} />
            <input type="time" value={recForm.end} onChange={(e) => setRecForm((f) => ({ ...f, end: e.target.value }))} style={inputStyle} />
            <input value={recForm.location} onChange={(e) => setRecForm((f) => ({ ...f, location: e.target.value }))} placeholder="Palestra" style={{ ...inputStyle, flex: "1 1 140px" }} />
            <button onClick={submitRecurrence}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: C.navy2, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> Aggiungi routine
            </button>
          </div>
        </Card>
      )}

      {/* ---------- Eventi passati ---------- */}
      {past.length > 0 && (
        <Card title="Già disputati" subtitle="Gli ultimi eventi passati, con i risultati">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {past.map((ev) => <EventCard key={ev.id} {...cardProps(ev)} />)}
          </div>
        </Card>
      )}

      <div style={{ ...font, fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
        <CalendarDays size={13} /> Promemoria automatico: la sera prima di ogni impegno (~20:00) arriva una notifica push a tutta la squadra.
      </div>
    </div>
  );
}
