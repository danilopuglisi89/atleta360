// Cruscotto d'uso, solo per l'admin: dopo il lancio serve sapere sui fatti
// chi sta usando l'app e cosa sta funzionando, non a sensazione.
// Nessuna tabella nuova: legge profiles (ultimo accesso, app installata) e
// participation_points (che è già il registro di ogni azione vera).
import { useEffect, useState } from "react";
import { Activity, Smartphone, Bell, TrendingDown } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";

const ACTION_LABEL = {
  checkin: "check-in energia", rsvp: "conferme presenza", self_assessment: "autovalutazioni",
  applause_given: "applausi", daily_moment: "momenti del giorno", quiz: "quiz", drop_raro: "drop",
};

const days = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

export default function UsageDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400e3).toISOString();
      const [p, pts, push] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, athlete_id, category, last_seen_at, pwa_installed").eq("status", "approved"),
        supabase.from("participation_points").select("user_id, action, created_at").gte("created_at", since),
        supabase.rpc("staff_push_status"),
      ]);
      const people = (p.data || []).filter((x) => x.category === "atleta");
      const pushIds = new Set((push.data || []).map((r) => r.user_id));
      const active = new Set((pts.data || []).map((r) => r.user_id));
      const byAction = {};
      (pts.data || []).forEach((r) => { byAction[r.action] = (byAction[r.action] || 0) + 1; });
      setData({ people, pushIds, active, byAction, totalPoints: (pts.data || []).length });
    })();
  }, []);

  if (!data) return null;
  const { people, pushIds, active, byAction } = data;
  if (!people.length) return null;

  const installed = people.filter((x) => x.pwa_installed).length;
  const withPush = people.filter((x) => pushIds.has(x.id)).length;
  const activeCount = people.filter((x) => active.has(x.id)).length;
  const name = (x) => [x.first_name, x.last_name].filter(Boolean).join(" ") || x.athlete_id || "—";
  // Chi sta scivolando via: nessun accesso da 7+ giorni (o mai entrata).
  const slipping = people
    .map((x) => ({ ...x, d: days(x.last_seen_at) }))
    .filter((x) => x.d === null || x.d >= 7)
    .sort((a, b) => (b.d ?? 9999) - (a.d ?? 9999));
  const topActions = Object.entries(byAction).sort((a, b) => b[1] - a[1]);

  const Stat = ({ icon: Icon, value, label, tone }) => (
    <div style={{ flex: "1 1 120px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon size={15} color={tone || C.navy2} />
        <span style={{ ...display, fontSize: 22, fontWeight: 700, color: C.ink }}>{value}</span>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>/ {people.length}</span>
      </div>
      <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <Card title="Come sta andando" subtitle="Solo per te: uso reale dell'app negli ultimi 7 giorni" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <Stat icon={Activity} value={activeCount} label="attive questa settimana" tone="#0F7A4E" />
        <Stat icon={Smartphone} value={installed} label="app installata" />
        <Stat icon={Bell} value={withPush} label="notifiche attive" />
      </div>

      {topActions.length > 0 && (
        <>
          <div style={{ ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Cosa usano davvero</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
            {topActions.map(([action, n]) => (
              <div key={action} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ ...font, fontSize: 13, color: C.ink, flex: "0 0 150px" }}>{ACTION_LABEL[action] || action}</span>
                <div style={{ flex: 1, height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(n / topActions[0][1]) * 100}%`, background: C.orange, borderRadius: 99 }} />
                </div>
                <span style={{ ...display, fontSize: 13, fontWeight: 700, color: C.ink, width: 34, textAlign: "right" }}>{n}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {slipping.length > 0 && (
        <>
          <div style={{ ...font, fontSize: 12, fontWeight: 700, color: "#B4520A", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingDown size={13} /> Le stai perdendo
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slipping.map((x) => (
              <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF3E6", borderRadius: 9, padding: "8px 12px" }}>
                <span style={{ ...font, fontSize: 13.5, color: C.ink, flex: 1 }}>{name(x)}</span>
                <span style={{ ...font, fontSize: 12, color: "#B4520A", fontWeight: 600 }}>
                  {x.d === null ? "mai entrata" : `${x.d} giorni fa`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
