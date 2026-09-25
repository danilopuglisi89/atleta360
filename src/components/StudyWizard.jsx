// "Conosciamoci meglio": dati per lo studio di Atleta360, chiesti una volta
// sola al primo accesso utile (vedi supabase/study.sql).
//
// La data di nascita è l'unico campo obbligatorio: finisce anche nei
// compleanni. Tutto il resto si può saltare, una schermata alla volta.
// "Più tardi" vale per la sessione: il questionario torna al prossimo
// accesso finché non viene salvato una volta.
//
// Solo atlete. Se lo script SQL non è ancora stato eseguito, my_study()
// fallisce e il questionario semplicemente non compare.
import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { supabase } from "../supabaseClient";

const LATER_KEY = "a360-studio-piu-tardi";
const PASSI = 5;

const input = {
  ...font, fontSize: 16, color: C.ink, background: C.card, border: `1.5px solid ${C.grid}`,
  borderRadius: 11, padding: "0 13px", height: 48, width: "100%", boxSizing: "border-box", outline: "none",
};
const label = { ...font, fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 6, display: "block" };

function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(([v, l]) => {
        const on = value === v;
        return (
          <button key={String(v)} type="button" onClick={() => onChange(on ? null : v)}
            style={{ ...font, minHeight: 40, padding: "0 13px", borderRadius: 99, fontSize: 14, cursor: "pointer",
              border: `1.5px solid ${on ? C.orange : C.grid}`, background: on ? C.orangeSoft : C.card,
              color: C.ink, fontWeight: on ? 600 : 400 }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

const Campo = ({ titolo, children }) => (
  <div style={{ marginBottom: 16 }}><label style={label}>{titolo}</label>{children}</div>
);

// Numero intero dentro un intervallo, oppure null (campo saltato o non valido).
const intIn = (v, min, max) => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export default function StudyWizard({ profile, onDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [f, setF] = useState({
    birth: "", height: "", hand: null, volleyYears: "", startAge: "", perWeek: null, other: "",
    school: null, schoolYear: null, travel: "", sleep: null, phone: null,
  });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v && v.target ? v.target.value : v }));

  useEffect(() => {
    if (!profile?.id || profile.category !== "atleta" || !profile.athlete_id) return;
    try { if (sessionStorage.getItem(LATER_KEY)) return; } catch { /* ignora */ }
    supabase.rpc("my_study").then(({ data, error }) => {
      if (error) return;                         // script non eseguito: niente questionario
      const r = data?.[0];
      if (!r || r.completed_at) return;          // già fatto, o profilo non collegato
      if (r.birth_date) setF((x) => ({ ...x, birth: r.birth_date }));
      setOpen(true);
    });
  }, [profile?.id]);

  if (!open) return null;

  const later = () => { try { sessionStorage.setItem(LATER_KEY, "1"); } catch { /* ignora */ } setOpen(false); };

  // La data deve dare un'età fra 8 e 45 anni (lo stesso controllo del database).
  const eta = f.birth ? Math.floor((Date.now() - new Date(f.birth).getTime()) / (365.25 * 864e5)) : null;
  const dataOk = eta !== null && eta >= 8 && eta <= 45;
  const puoAvanzare = step === 0 ? dataOk : true;
  const ultimo = step === PASSI - 1;
  const studia = f.school && !["universita", "lavoro", "altro"].includes(f.school);

  const salva = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("set_my_study", {
      p_birth_date: f.birth,
      p_volley_years: intIn(f.volleyYears, 0, 20),
      p_start_age: intIn(f.startAge, 3, 20),
      p_trainings_per_week: f.perWeek,
      p_other_sports: f.other.trim().slice(0, 120) || null,
      p_height_cm: intIn(f.height, 120, 215),
      p_dominant_hand: f.hand,
      p_school_type: f.school,
      p_school_year: studia ? f.schoolYear : null,
      p_travel_minutes: intIn(f.travel, 0, 240),
      p_sleep_hours: f.sleep,
      p_phone_hours: f.phone,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false);
    onDone?.();
  };

  const Titolo = ({ t, s }) => (
    <>
      <div style={{ ...display, fontSize: 21, fontWeight: 700, color: C.ink }}>{t}</div>
      <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "6px 0 18px" }}>{s}</p>
    </>
  );

  return (
    // zIndex 86: in fila dopo l'autovalutazione (90) e il profilo (88).
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 86, background: "rgba(10,19,48,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="a360-reveal" style={{ width: "100%", maxWidth: 460, background: C.card, borderRadius: 20, boxShadow: "0 24px 70px rgba(10,22,80,0.4)", padding: 24, maxHeight: "88vh", overflowY: "auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={17} color={C.orange} />
          <span style={{ ...font, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.orange }}>
            Conosciamoci meglio · {step + 1} di {PASSI}
          </span>
        </div>

        {step === 0 && (
          <>
            <Titolo t="Quando sei nata?" s="Serve per lo studio di Atleta360 e per farti gli auguri il giorno giusto. Sono cinque schermate veloci: dopo questa, puoi saltare quello che vuoi." />
            <Campo titolo="Data di nascita">
              <input type="date" style={input} value={f.birth} onChange={set("birth")} max={new Date().toISOString().slice(0, 10)} />
            </Campo>
            {f.birth && !dataOk && <div style={{ ...font, fontSize: 13, color: "#B4232A" }}>Controlla la data: non sembra giusta.</div>}
            <div style={{ ...font, fontSize: 12.5, color: C.muted, lineHeight: 1.5, background: C.surface, borderRadius: 10, padding: "10px 12px", marginTop: 6 }}>
              Queste risposte non le vedono le compagne né il mister: servono solo allo studio. Allo staff arriva la data di nascita, per i compleanni.
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Titolo t="Un po' di te" s="Altezza e mano: aiutano a leggere i ruoli in campo." />
            <Campo titolo="Altezza (cm)">
              <input style={input} inputMode="numeric" placeholder="es. 172" value={f.height} onChange={set("height")} />
            </Campo>
            <Campo titolo="Mano dominante">
              <Chips value={f.hand} onChange={set("hand")} options={[["destra", "Destra"], ["sinistra", "Sinistra"], ["ambidestra", "Tutte e due"]]} />
            </Campo>
          </>
        )}

        {step === 2 && (
          <>
            <Titolo t="La tua storia con la pallavolo" s="Da quanto giochi e quanto ti alleni." />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Campo titolo="Anni di pallavolo">
                <input style={input} inputMode="numeric" placeholder="es. 6" value={f.volleyYears} onChange={set("volleyYears")} />
              </Campo></div>
              <div style={{ flex: 1 }}><Campo titolo="A che età hai iniziato">
                <input style={input} inputMode="numeric" placeholder="es. 9" value={f.startAge} onChange={set("startAge")} />
              </Campo></div>
            </div>
            <Campo titolo="Allenamenti di pallavolo a settimana">
              <Chips value={f.perWeek} onChange={set("perWeek")} options={[1, 2, 3, 4, 5, 6].map((n) => [n, n === 6 ? "6+" : String(n)])} />
            </Campo>
            <Campo titolo="Fai altri sport? (facoltativo)">
              <input style={input} maxLength={120} placeholder="es. nuoto, danza" value={f.other} onChange={set("other")} />
            </Campo>
          </>
        )}

        {step === 3 && (
          <>
            <Titolo t="Scuola e tempo" s="La scuola e la strada fino in palestra pesano sulla stanchezza: ci aiutano a leggere i tuoi dati." />
            <Campo titolo="Cosa fai">
              <Chips value={f.school} onChange={set("school")} options={[
                ["liceo", "Liceo"], ["tecnico", "Istituto tecnico"], ["professionale", "Professionale"],
                ["universita", "Università"], ["lavoro", "Lavoro"], ["altro", "Altro"]]} />
            </Campo>
            {studia && (
              <Campo titolo="Che anno">
                <Chips value={f.schoolYear} onChange={set("schoolYear")} options={[1, 2, 3, 4, 5].map((n) => [n, `${n}ª`])} />
              </Campo>
            )}
            <Campo titolo="Minuti per arrivare in palestra">
              <input style={input} inputMode="numeric" placeholder="es. 20" value={f.travel} onChange={set("travel")} />
            </Campo>
          </>
        )}

        {step === 4 && (
          <>
            <Titolo t="Le tue abitudini" s="Più o meno, non serve precisione. Rispondi solo se ti va." />
            <Campo titolo="Quante ore dormi a notte, di solito">
              <Chips value={f.sleep} onChange={set("sleep")} options={[5, 6, 7, 8, 9, 10].map((n) => [n, n === 5 ? "5 o meno" : n === 10 ? "10+" : String(n)])} />
            </Campo>
            <Campo titolo="Quante ore al giorno usi il telefono">
              <Chips value={f.phone} onChange={set("phone")} options={[[1, "1 o meno"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6+"]]} />
            </Campo>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
              Sull'iPhone lo trovi in Impostazioni → Tempo di utilizzo; su Android in Benessere digitale.
            </div>
          </>
        )}

        {err && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginTop: 14 }}>{err}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, height: 46, padding: "0 14px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              <ChevronLeft size={16} /> Indietro
            </button>
          )}
          <button onClick={() => (ultimo ? salva() : setStep((s) => s + 1))} disabled={!puoAvanzare || busy}
            style={{ ...font, flexGrow: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, height: 46, borderRadius: 11, border: "none", background: puoAvanzare ? C.orange : C.grid, color: puoAvanzare ? "#fff" : C.muted, fontSize: 15, fontWeight: 600, cursor: puoAvanzare && !busy ? "pointer" : "default" }}>
            {busy ? "Salvo…" : ultimo ? <><Check size={17} /> Finito</> : <>Avanti <ChevronRight size={17} /></>}
          </button>
        </div>

        {step > 0 && !ultimo && (
          <button onClick={() => setStep(PASSI - 1)}
            style={{ ...font, display: "block", margin: "12px auto 0", background: "none", border: "none", color: C.navy2, fontSize: 13, cursor: "pointer", height: 32, textDecoration: "underline" }}>
            Salta alla fine
          </button>
        )}
        {(
          <button onClick={later}
            style={{ ...font, display: "block", margin: "12px auto 0", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", height: 32 }}>
            Più tardi
          </button>
        )}
      </div>
    </div>
  );
}
