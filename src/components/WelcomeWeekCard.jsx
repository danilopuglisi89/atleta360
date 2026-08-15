// "I tuoi primi passi": la settimana zero. Al lancio l'app è vuota per
// forza — questa card dà alla ragazza una cosa da fare alla volta, e
// sparisce da sola quando le ha fatte tutte. Nessuna tabella nuova: ogni
// passo si considera fatto guardando i dati che già esistono.
import { useEffect, useState } from "react";
import { Check, Sparkles, ChevronRight } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";
import { useCheckins } from "../wellbeing";
import { useWeeklyQuiz } from "../quiz";

export default function WelcomeWeekCard({ uid, athleteId, hasAvatar, hasSelf, hasMotto, onGoView, onGoCheckin, onGoQuiz }) {
  const { today: checkinToday } = useCheckins(athleteId);
  const { mine: quizDone } = useWeeklyQuiz(uid);
  const [hasPhoto, setHasPhoto] = useState(null);      // null = sto ancora guardando
  const [hasMoment, setHasMoment] = useState(null);

  useEffect(() => {
    if (!uid) return;
    supabase.from("photos").select("id").eq("uploaded_by", uid).limit(1)
      .then(({ data }) => setHasPhoto(!!data?.length));
    supabase.from("daily_moments").select("id").eq("user_id", uid).limit(1)
      .then(({ data }) => setHasMoment(!!data?.length));
  }, [uid]);

  if (!uid) return null;
  if (hasPhoto === null || hasMoment === null) return null;   // niente lampeggi

  const steps = [
    { id: "avatar", label: "Crea il tuo avatar", done: !!hasAvatar, go: () => onGoView?.("personale") },
    { id: "self", label: "Raccontaci come ti vedi", done: !!hasSelf, go: () => onGoView?.("profilo") },
    { id: "checkin", label: "Fai il primo check-in", done: checkinToday != null, go: onGoCheckin },
    { id: "motto", label: "Scegli il tuo motto", done: !!hasMotto, go: () => onGoView?.("personale") },
    { id: "photo", label: "Carica una foto in album", done: hasPhoto, go: null },
    { id: "moment", label: "Racconta un momento della giornata", done: hasMoment, go: null },
    { id: "quiz", label: "Prova il quiz della settimana", done: !!quizDone, go: onGoQuiz },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;   // finita: sparisce per sempre

  const next = steps.find((s) => !s.done);

  return (
    <Card style={{ marginTop: 16, background: "linear-gradient(120deg, #FFF3E6 0%, #FFE9D5 100%)", border: "1px solid #FFD3A0" }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: "#B4520A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
        <Sparkles size={14} /> I tuoi primi passi
      </div>
      <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink, marginTop: 6 }}>
        {doneCount} di {steps.length} fatti
      </div>

      <div style={{ height: 7, background: "rgba(255,255,255,0.7)", borderRadius: 99, overflow: "hidden", margin: "10px 0 14px" }}>
        <div style={{ height: "100%", width: `${(doneCount / steps.length) * 100}%`, background: C.orange, borderRadius: 99, transition: "width .3s" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {steps.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 19, height: 19, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: s.done ? "#0F7A4E" : "rgba(255,255,255,0.8)", border: s.done ? "none" : `1px solid ${C.grid}` }}>
              {s.done && <Check size={12} color="#fff" />}
            </span>
            <span style={{ ...font, fontSize: 13.5, color: s.done ? C.muted : C.ink, textDecoration: s.done ? "line-through" : "none" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {next?.go && (
        <button onClick={next.go}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, padding: "10px 15px", borderRadius: 10,
            border: "none", background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          {next.label} <ChevronRight size={15} />
        </button>
      )}
    </Card>
  );
}
