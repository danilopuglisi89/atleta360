// App "Impostazioni", solo admin: navigazione stile iPhone (gruppi,
// frecce, pagine che scivolano da destra, tasto Indietro), ricerca in
// cima, adattata a due colonne su desktop. Vedi supabase/settings.sql
// per il motore (tabella app_settings, notifiche spente alla fonte).
import { useEffect, useMemo, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Search, Gamepad2, Users, HeartPulse, BellRing,
  ListChecks, MapPin, Shield, Activity, Info, AlertTriangle, Plus, Trash2, Save, Check,
} from "lucide-react";
import { C, font, display } from "../../theme";
import { supabase } from "../../supabaseClient";
import { useAppSettings, FEATURE_GROUPS } from "../../settings";
import UsageDashboard from "../UsageDashboard";
import AdminChatLog from "../../AdminChatLog";

/* ============================================================
   Primitive stile iOS: riga di lista con freccina, toggle, gruppo.
   ============================================================ */
function IosGroup({ title, footer, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      {title && <div style={{ ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 4px 8px" }}>{title}</div>}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.grid}`, overflow: "hidden" }}>
        {children}
      </div>
      {footer && <div style={{ ...font, fontSize: 12, color: C.muted, padding: "8px 4px 0", lineHeight: 1.5 }}>{footer}</div>}
    </div>
  );
}

function IosRow({ icon: Icon, iconBg, label, sub, onClick, right, last }) {
  return (
    <div onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default",
        borderBottom: last ? "none" : `1px solid ${C.grid}` }}>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg || C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#fff" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...font, fontSize: 14.5, color: C.ink }}>{label}</div>
        {sub && <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
      {onClick && <ChevronRight size={17} color={C.muted} style={{ flexShrink: 0 }} />}
    </div>
  );
}

function Toggle({ on, onChange, busy }) {
  return (
    <button onClick={() => { navigator.vibrate?.(10); onChange(!on); }} disabled={busy}
      style={{ width: 46, height: 27, borderRadius: 99, border: "none", cursor: busy ? "default" : "pointer",
        background: on ? "#34C759" : "#DEDEE3", position: "relative", flexShrink: 0, transition: "background .15s", opacity: busy ? 0.6 : 1 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 21 : 2, width: 23, height: 23, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)", transition: "left .15s" }} />
    </button>
  );
}

/* ============================================================
   Pagine
   ============================================================ */
function FeatureTogglePage({ groupKey, settings }) {
  const items = FEATURE_GROUPS[groupKey];
  return (
    <IosGroup footer="Spenta, una funzione sparisce subito dall'app delle ragazze — nessun avviso. I dati già raccolti restano salvi.">
      {items.map((it, i) => (
        <IosRow key={it.key} label={it.label} last={i === items.length - 1}
          right={<Toggle on={!!settings.flags[it.key]} onChange={(v) => settings.setFlag(it.key, v)} />} />
      ))}
    </IosGroup>
  );
}

function SkillsSettingsPage() {
  const [skills, setSkills] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const load = () => supabase.from("skills").select("*").order("sort_order", { ascending: true }).then(({ data }) => setSkills(data || []));
  useEffect(() => { load(); }, []);

  const slugify = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "focus";

  const addSkill = async () => {
    const title = newTitle.trim(); if (!title) return;
    const key = slugify(title);
    const sort_order = (skills || []).reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0) + 1;
    await supabase.from("skills").insert({ key, title, short: title.slice(0, 10), sort_order });
    setNewTitle(""); load();
  };
  const toggleSkill = async (s) => { await supabase.from("skills").update({ active: !s.active }).eq("id", s.id); load(); };
  const updateField = async (s, patch) => { await supabase.from("skills").update(patch).eq("id", s.id); load(); };
  const delSkill = async (s) => { if (window.confirm(`Eliminare il focus "${s.title}"?`)) { await supabase.from("skills").delete().eq("id", s.id); load(); } };

  if (!skills) return <div style={{ ...font, fontSize: 13, color: C.muted }}>Carico…</div>;

  return (
    <>
      <IosGroup title="Nuovo focus">
        <div style={{ display: "flex", gap: 8, padding: 12 }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()}
            placeholder="Es. Spirito di squadra" style={{ ...font, flex: 1, fontSize: 14, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 11px", outline: "none" }} />
          <button onClick={addSkill} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: "pointer" }}>
            <Plus size={15} /> Aggiungi
          </button>
        </div>
      </IosGroup>
      <IosGroup title={`${skills.length} competenze`}>
        {skills.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i === skills.length - 1 ? "none" : `1px solid ${C.grid}`, opacity: s.active ? 1 : 0.5 }}>
            <input defaultValue={s.title} onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && updateField(s, { title: e.target.value.trim() })}
              style={{ ...font, flex: 1, fontSize: 14, border: "none", background: "none", outline: "none", color: C.ink }} />
            <Toggle on={s.active !== false} onChange={() => toggleSkill(s)} />
            <button onClick={() => delSkill(s)} style={{ background: "none", border: "none", color: "#B4232A", cursor: "pointer", display: "flex" }}><Trash2 size={15} /></button>
          </div>
        ))}
      </IosGroup>
    </>
  );
}

function VenuesSettingsPage({ settings }) {
  const [draft, setDraft] = useState(settings.venues);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => { setDraft(settings.venues); }, [settings.venues]);

  const update = (i, patch) => setDraft((d) => d.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const remove = (i) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const add = () => setDraft((d) => [...d, { short: "", full: "" }]);
  const save = async () => {
    setBusy(true);
    await settings.setVenues(draft.filter((v) => v.short.trim() && v.full.trim()));
    setBusy(false); setFlash(true); setTimeout(() => setFlash(false), 2000);
  };

  return (
    <IosGroup title="Palestre di casa" footer="Compaiono come scorciatoie nel campo luogo di eventi e routine, in Calendario.">
      {draft.map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, borderBottom: `1px solid ${C.grid}` }}>
          <input value={v.short} onChange={(e) => update(i, { short: e.target.value })} placeholder="Nome breve (es. PalaGalilei)"
            style={{ ...font, fontSize: 14, fontWeight: 600, border: "none", outline: "none", color: C.ink }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input value={v.full} onChange={(e) => update(i, { full: e.target.value })} placeholder="Indirizzo completo"
              style={{ ...font, flex: 1, fontSize: 12.5, color: C.muted, border: "none", outline: "none" }} />
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "#B4232A", cursor: "pointer" }}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <div style={{ padding: 12, display: "flex", gap: 8 }}>
        <button onClick={add} style={{ ...font, fontSize: 13, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, cursor: "pointer" }}>
          <Plus size={14} style={{ verticalAlign: -2 }} /> Aggiungi palestra
        </button>
        <button onClick={save} disabled={busy}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: "none", background: flash ? "#0F7A4E" : C.orange, color: "#fff", cursor: "pointer" }}>
          {flash ? <Check size={14} /> : <Save size={14} />} {flash ? "Salvato" : "Salva"}
        </button>
      </div>
    </IosGroup>
  );
}

function TeamSettingsPage({ settings }) {
  const [name, setName] = useState(settings.teamName);
  const [flash, setFlash] = useState(false);
  useEffect(() => { setName(settings.teamName); }, [settings.teamName]);
  const save = async () => { await settings.setTeamName(name.trim() || settings.teamName); setFlash(true); setTimeout(() => setFlash(false), 2000); };
  return (
    <IosGroup title="Squadra" footer="Il nome compare nel report squadra e nei materiali stampati.">
      <div style={{ padding: 12, display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...font, flex: 1, fontSize: 14, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 11px", outline: "none" }} />
        <button onClick={save} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 9, border: "none", background: flash ? "#0F7A4E" : C.orange, color: "#fff", cursor: "pointer" }}>
          {flash ? <Check size={14} /> : <Save size={14} />} {flash ? "Salvato" : "Salva"}
        </button>
      </div>
    </IosGroup>
  );
}

function MonitoringPage() {
  const [showLog, setShowLog] = useState(false);
  return (
    <>
      <UsageDashboard />
      <IosGroup title="Sicurezza" style={{ marginTop: 20 }}>
        <IosRow icon={Shield} iconBg={C.navy2} label="Log chat" sub="Registro dei messaggi, per tutela" onClick={() => setShowLog((v) => !v)} last />
      </IosGroup>
      {showLog && <AdminChatLog />}
    </>
  );
}

function InfoPage() {
  const [health, setHealth] = useState(null);
  useEffect(() => { fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth({ error: true })); }, []);
  return (
    <IosGroup title="Stato">
      <IosRow icon={Info} iconBg={C.muted} label="Coach IA" sub={health ? (health.coach ? "Attivo" : "Non configurato") : "Verifico…"} last={false} />
      <IosRow icon={BellRing} iconBg={C.muted} label="Notifiche push" sub={health ? (health.push ? "Attive" : "Non configurate") : "Verifico…"} last />
    </IosGroup>
  );
}

function DangerZonePage() {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const clearOldNotifs = async () => {
    if (!window.confirm("Eliminare tutte le notifiche più vecchie di 30 giorni, per tutti?")) return;
    setBusy("notifs");
    const { data, error } = await supabase.rpc("admin_clear_old_notifications");
    setBusy(null);
    setMsg(error ? error.message : `Eliminate ${data} notifiche.`);
  };
  const resetTestData = async () => {
    if (!window.confirm("Ripulire i TUOI dati di test (check-in, momenti, punti)? Solo il tuo account, non tocca le atlete.")) return;
    setBusy("test");
    const { error } = await supabase.rpc("admin_reset_my_test_data");
    setBusy(null);
    setMsg(error ? error.message : "Dati di test ripuliti sul tuo account.");
  };

  return (
    <IosGroup title="Zona rossa" footer="Solo sul tuo account: mai un'azione che tocca i dati reali delle atlete.">
      <IosRow icon={AlertTriangle} iconBg="#B4232A" label="Svuota notifiche vecchie" sub="Elimina quelle oltre 30 giorni, per tutti" onClick={busy ? undefined : clearOldNotifs} />
      <IosRow icon={AlertTriangle} iconBg="#B4232A" label="Ripulisci i miei dati di test" sub="Solo sul tuo account admin" onClick={busy ? undefined : resetTestData} last />
      {msg && <div style={{ ...font, fontSize: 12.5, color: C.muted, padding: "10px 14px", borderTop: `1px solid ${C.grid}` }}>{msg}</div>}
    </IosGroup>
  );
}

/* ============================================================
   Struttura pagine radice
   ============================================================ */
function useSettingsPages(settings) {
  return useMemo(() => ([
    { id: "giochi", title: "Giochi", icon: Gamepad2, iconBg: "#8B5CF6", render: () => <FeatureTogglePage groupKey="giochi" settings={settings} /> },
    { id: "sociale", title: "Sociale", icon: Users, iconBg: "#E11D74", render: () => <FeatureTogglePage groupKey="sociale" settings={settings} /> },
    { id: "benessere", title: "Benessere", icon: HeartPulse, iconBg: "#0EA394", render: () => <FeatureTogglePage groupKey="benessere" settings={settings} /> },
    { id: "notifiche", title: "Notifiche automatiche", icon: BellRing, iconBg: "#FF7A18", render: () => <FeatureTogglePage groupKey="notifiche" settings={settings} /> },
    { id: "focus", title: "Competenze", icon: ListChecks, iconBg: "#17297A", render: () => <SkillsSettingsPage /> },
    { id: "palestre", title: "Palestre", icon: MapPin, iconBg: "#0F7A4E", render: () => <VenuesSettingsPage settings={settings} /> },
    { id: "squadra", title: "Squadra e identità", icon: Shield, iconBg: "#0A1650", render: () => <TeamSettingsPage settings={settings} /> },
    { id: "monitoraggio", title: "Monitoraggio", icon: Activity, iconBg: "#0EA5E9", render: () => <MonitoringPage /> },
    { id: "info", title: "Info e diagnostica", icon: Info, iconBg: C.muted, render: () => <InfoPage /> },
    { id: "danger", title: "Zona rossa", icon: AlertTriangle, iconBg: "#B4232A", render: () => <DangerZonePage /> },
  ]), [settings]);
}

/* ============================================================
   Navigazione mobile: pila di pagine a schermo intero, slide da destra,
   tasto Indietro. Niente doppio buffer per il gesto di swipe (non
   richiesto): ogni pagina che entra riproduce un'animazione al montaggio.
   ============================================================ */
function MobileNav({ pages, query, setQuery, onClose }) {
  const [stack, setStack] = useState(["root"]);
  const [dir, setDir] = useState("fwd");
  const top = stack[stack.length - 1];
  const push = (id) => { setDir("fwd"); setStack((s) => [...s, id]); };
  const pop = () => { setDir("back"); setStack((s) => s.slice(0, -1)); };

  const filtered = query.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : pages;

  const current = top === "root" ? null : pages.find((p) => p.id === top);
  const prevTitle = stack.length >= 2 ? (stack[stack.length - 2] === "root" ? "Impostazioni" : pages.find((p) => p.id === stack[stack.length - 2])?.title) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: C.surface, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "calc(14px + env(safe-area-inset-top)) 14px 12px", background: C.card, borderBottom: `1px solid ${C.grid}` }}>
        {top !== "root" ? (
          <button onClick={pop} style={{ ...font, display: "flex", alignItems: "center", gap: 2, fontSize: 15, color: C.orange, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
            <ChevronLeft size={20} /> {prevTitle}
          </button>
        ) : (
          <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink, flex: 1 }}>Impostazioni</div>
        )}
        {top === "root" && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", marginLeft: "auto" }}><X size={22} /></button>
        )}
        {top !== "root" && (
          <button onClick={onClose} style={{ ...font, fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}>Chiudi</button>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div key={top} className={dir === "fwd" ? "a360-settings-slide-fwd" : "a360-settings-slide-back"}
          style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 16 }}>
          {top === "root" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 11, padding: "10px 13px", marginBottom: 18 }}>
                <Search size={16} color={C.muted} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nelle impostazioni"
                  style={{ ...font, flex: 1, fontSize: 14, border: "none", outline: "none", background: "none", color: C.ink }} />
              </div>
              <IosGroup>
                {filtered.map((p, i) => (
                  <IosRow key={p.id} icon={p.icon} iconBg={p.iconBg} label={p.title} onClick={() => push(p.id)} last={i === filtered.length - 1} />
                ))}
                {filtered.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted, padding: 14 }}>Nessun risultato.</div>}
              </IosGroup>
            </>
          ) : (
            <>
              <div style={{ ...display, fontSize: 22, fontWeight: 700, color: C.ink, margin: "4px 0 16px" }}>{current?.title}</div>
              {current?.render()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Layout desktop: colonna elenco + pannello dettaglio.
   ============================================================ */
function DesktopShell({ pages, query, setQuery, onClose }) {
  const [sel, setSel] = useState(null);
  const filtered = query.trim() ? pages.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase())) : pages;
  const current = pages.find((p) => p.id === sel);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,19,48,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 900, height: "80vh", background: C.surface, borderRadius: 18, overflow: "hidden", display: "flex", boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ width: 280, flexShrink: 0, background: C.card, borderRight: `1px solid ${C.grid}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink }}>Impostazioni</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex" }}><X size={20} /></button>
          </div>
          <div style={{ padding: "0 18px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 10, padding: "8px 11px" }}>
              <Search size={14} color={C.muted} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca"
                style={{ ...font, flex: 1, fontSize: 13, border: "none", outline: "none", background: "none", color: C.ink }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
            {filtered.map((p) => {
              const on = p.id === sel;
              const Icon = p.icon;
              return (
                <div key={p.id} onClick={() => setSel(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, cursor: "pointer", background: on ? C.orangeSoft : "transparent", marginBottom: 2 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: p.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="#fff" />
                  </div>
                  <span style={{ ...font, fontSize: 13.5, color: on ? C.orange : C.ink, fontWeight: on ? 600 : 400 }}>{p.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
          {current ? (
            <>
              <div style={{ ...display, fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 18 }}>{current.title}</div>
              {current.render()}
            </>
          ) : (
            <div style={{ ...font, fontSize: 14, color: C.muted, textAlign: "center", marginTop: 60 }}>Scegli una voce dall'elenco.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Entry point
   ============================================================ */
export default function SettingsApp({ onClose }) {
  const settings = useAppSettings();
  const pages = useSettingsPages(settings);
  const [query, setQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 860px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 860px)");
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop
    ? <DesktopShell pages={pages} query={query} setQuery={setQuery} onClose={onClose} />
    : <MobileNav pages={pages} query={query} setQuery={setQuery} onClose={onClose} />;
}
