// Autovalutazione guidata di benvenuto ("conosciamoci"): proposta alle atlete
// alla prima apertura, finché non la completano. Un passo per ogni focus, con
// la spiegazione di cos'è e uno slider 1-10; alla fine salva in self_assessments.
// Funziona anche PRIMA del primo rilevamento del mister (legge focus e atleta
// direttamente dal database, senza passare dal modello della dashboard).
//
// Per lo staff/admin è visibile in modalità "anteprima di prova": stesso
// percorso, ma alla fine non salva nulla.
import { useEffect, useMemo, useState } from "react";
import { Sparkles, ChevronRight, ChevronLeft, CheckCircle2, X } from "lucide-react";
import { C, font, display } from "../theme";
import { supabase } from "../supabaseClient";

const LATER_KEY = "a360-selfwizard-later";       // "Più tardi": solo per questa apertura
const TEST_DONE_KEY = "a360-selfwizard-testdone"; // staff: anteprima completata, non riproporre

export default function SelfAssessmentWizard({ profile, isStaff, onDone }) {
  const [ready, setReady] = useState(false);      // controlli iniziali finiti
  const [skills, setSkills] = useState([]);
  const [athleteUuid, setAthleteUuid] = useState(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);            // 0 = benvenuto, 1..N = focus, N+1 = fine
  const [scores, setScores] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const testMode = isStaff;                        // staff/admin: percorso di prova, nessun salvataggio
  const isAthlete = profile?.category === "atleta" && profile?.status === "approved" && !!profile?.athlete_id;

  // Decide se proporre il wizard: atleta senza nessuna autovalutazione, oppure
  // staff che non ha ancora fatto l'anteprima di prova.
  useEffect(() => {
    (async () => {
      if (sessionStorage.getItem(LATER_KEY)) return;
      if (!isAthlete && !testMode) return;
      if (testMode && localStorage.getItem(TEST_DONE_KEY)) return;

      const { data: sk } = await supabase.from("skills").select("key,title,description").eq("active", true).order("sort_order");
      if (!sk?.length) return;

      let uuid = null;
      if (isAthlete) {
        const { data: a } = await supabase.from("athletes").select("id").eq("identifier", profile.athlete_id).maybeSingle();
        uuid = a?.id || null;
        if (!uuid) return;                         // atleta non ancora in anagrafica: niente wizard
        const { count } = await supabase.from("self_assessments").select("id", { count: "exact", head: true }).eq("athlete_id", uuid);
        if ((count || 0) > 0) return;              // l'ha già fatta: mai più
      }

      setSkills(sk);
      setAthleteUuid(uuid);
      const init = {};
      sk.forEach((k) => (init[k.key] = 6));
      setScores(init);
      setReady(true);
      const t = setTimeout(() => setOpen(true), 1800);
      return () => clearTimeout(t);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const later = () => { sessionStorage.setItem(LATER_KEY, "1"); setOpen(false); };

  const finish = async () => {
    if (testMode) { localStorage.setItem(TEST_DONE_KEY, "1"); setSaved(true); return; }
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("self_assessments").insert({
      athlete_id: athleteUuid, scores, created_by: u?.user?.id || null,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
    onDone && onDone();
  };

  const total = skills.length;
  const current = step >= 1 && step <= total ? skills[step - 1] : null;
  const firstName = profile?.first_name || "";

  const progress = useMemo(() => (
    <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 14 }}>
      {skills.map((k, i) => (
        <span key={k.key} style={{ width: 8, height: 8, borderRadius: 99, background: i + 1 < step ? C.orange : i + 1 === step ? C.navy2 : C.grid }} />
      ))}
    </div>
  ), [skills, step]);

  if (!ready || !open) return null;

  return (
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,19,48,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="a360-reveal" style={{ width: "100%", maxWidth: 460, background: C.card, borderRadius: 20, boxShadow: "0 24px 70px rgba(10,22,80,0.4)", padding: 24, position: "relative", maxHeight: "88vh", overflowY: "auto" }}>
        {!saved && (
          <button onClick={later} aria-label="Più tardi" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
            <X size={18} />
          </button>
        )}

        {testMode && !saved && (
          <div style={{ ...font, fontSize: 11.5, fontWeight: 700, color: C.navy2, background: C.surface, borderRadius: 8, padding: "5px 10px", display: "inline-block", marginBottom: 10 }}>
            ANTEPRIMA DI PROVA (staff) — alla fine non salva nulla
          </div>
        )}

        {/* ---------- Fine ---------- */}
        {saved ? (
          <div style={{ textAlign: "center", padding: "18px 4px" }}>
            <CheckCircle2 size={44} color="#0F7A4E" style={{ marginBottom: 12 }} />
            <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink }}>
              {testMode ? "Anteprima completata!" : "Autovalutazione salvata! 🎉"}
            </div>
            <p style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 8 }}>
              {testMode
                ? "Questo è il percorso che vedranno le atlete alla prima apertura. Nessun dato è stato salvato."
                : "La trovi nel tuo profilo: quando il mister farà il primo rilevamento, vedrai il confronto tra come ti vedi tu e come ti vede lui."}
            </p>
            <button onClick={() => setOpen(false)}
              style={{ ...font, marginTop: 16, padding: "12px 22px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
              Vai alla dashboard
            </button>
          </div>

        /* ---------- Benvenuto ---------- */
        ) : step === 0 ? (
          <div style={{ textAlign: "center", padding: "10px 4px" }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: C.orangeSoft, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Sparkles size={26} />
            </div>
            <div style={{ ...display, fontSize: 20, fontWeight: 700, color: C.ink }}>
              {firstName ? `Ciao ${firstName}! 👋` : "Benvenuta! 👋"}
            </div>
            <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
              Prima di cominciare, <b style={{ color: C.ink }}>raccontaci come ti vedi</b>: per ognuna delle {total} competenze
              ti spieghiamo cos'è e ti chiediamo un voto da 1 a 10 su te stessa.
              <br />Ci vogliono 2 minuti — e non esistono risposte sbagliate.
            </p>
            <button onClick={() => setStep(1)}
              style={{ ...font, marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 12, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Iniziamo <ChevronRight size={17} />
            </button>
            <div>
              <button onClick={later} style={{ ...font, marginTop: 12, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Più tardi
              </button>
            </div>
          </div>

        /* ---------- Un focus per volta ---------- */
        ) : current ? (
          <div>
            <div style={{ ...font, fontSize: 12, color: C.muted, fontWeight: 600 }}>Competenza {step} di {total}</div>
            <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink, marginTop: 4 }}>{current.title}</div>
            {current.description && (
              <p style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 8, background: C.surface, borderRadius: 12, padding: "12px 14px" }}>
                {current.description}
              </p>
            )}
            <div style={{ ...font, fontSize: 13.5, color: C.ink, marginTop: 14, fontWeight: 600 }}>Quanto ti riconosci, da 1 a 10?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <input type="range" min={1} max={10} step={1} value={scores[current.key] ?? 6}
                onChange={(e) => setScores((s) => ({ ...s, [current.key]: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: C.orange }} />
              <span style={{ ...display, fontSize: 26, fontWeight: 700, color: C.orange, width: 40, textAlign: "center" }}>{scores[current.key] ?? 6}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", ...font, fontSize: 11, color: C.muted, marginTop: 2 }}>
              <span>Per niente</span><span>Moltissimo</span>
            </div>
            {progress}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep((s) => s - 1)}
                style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 15px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, fontSize: 13.5, cursor: "pointer" }}>
                <ChevronLeft size={16} /> Indietro
              </button>
              <button onClick={() => setStep((s) => s + 1)}
                style={{ ...font, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 15px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
                {step === total ? "Riepilogo" : "Avanti"} <ChevronRight size={16} />
              </button>
            </div>
          </div>

        /* ---------- Riepilogo + salvataggio ---------- */
        ) : (
          <div>
            <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink }}>Il tuo ritratto ✨</div>
            <p style={{ ...font, fontSize: 13, color: C.muted, marginTop: 4 }}>Controlla i voti: puoi tornare indietro per cambiarli.</p>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {skills.map((k) => (
                <div key={k.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, borderRadius: 10, padding: "9px 13px" }}>
                  <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{k.title}</span>
                  <span style={{ ...display, fontSize: 16, fontWeight: 700, color: C.orange }}>{scores[k.key]}</span>
                </div>
              ))}
            </div>
            {error && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(total)}
                style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 15px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, fontSize: 13.5, cursor: "pointer" }}>
                <ChevronLeft size={16} /> Indietro
              </button>
              <button onClick={finish} disabled={busy}
                style={{ ...font, flex: 1, padding: "11px 15px", borderRadius: 11, border: "none", background: "#0F7A4E", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Salvo…" : testMode ? "Concludi l'anteprima" : "Salva la mia autovalutazione"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
