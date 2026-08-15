// "Il tuo Wrapped di stagione": stessa messa in scena del Wrapped
// settimanale (WrappedStory), ma con i totali da sempre invece che sugli
// ultimi 7 giorni — calcolati al tocco, non ad ogni apertura del profilo.
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { font } from "../theme";
import { supabase } from "../supabaseClient";
import WrappedStory from "./WrappedStory";

const ACTION_LABEL = {
  checkin: "check-in energia", rsvp: "conferme presenza", self_assessment: "autovalutazioni",
  applause_given: "applausi dati", daily_moment: "momenti del giorno", quiz: "risposte al quiz", drop_raro: "drop fortunati",
};

export default function SeasonWrappedButton({ uid, name, avatarUrl, bgUrl, bgStyle, streak, level, starsCount, badgesCount }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  const openWrapped = async () => {
    setOpen(true);
    if (data) return;
    const { data: rows } = await supabase.from("participation_points").select("action,points").eq("user_id", uid);
    const total = (rows || []).reduce((a, r) => a + r.points, 0);
    const byAction = {};
    (rows || []).forEach((r) => { const l = ACTION_LABEL[r.action] || r.action; byAction[l] = (byAction[l] || 0) + 1; });
    setData({ total, byAction });
  };

  if (!uid) return null;

  return (
    <>
      <button onClick={openWrapped}
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #7A0C1E, #FF7A18)", color: "#fff", cursor: "pointer" }}>
        <Sparkles size={16} /> Il tuo Wrapped di stagione
      </button>
      {open && data && (
        <WrappedStory name={name} total={data.total} byAction={data.byAction} streak={streak} level={level}
          starsCount={starsCount} badgesCount={badgesCount} onClose={() => setOpen(false)}
          shareData={{ name, avatarUrl, total: data.total, byAction: data.byAction, streak, level, bgUrl, bgStyle }} />
      )}
    </>
  );
}
