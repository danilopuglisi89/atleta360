// Il bilancio della stagione: quanto la squadra usa l'app e quanto lavoro
// è stato prodotto. Serve a guardare l'andamento durante l'anno e ad avere
// numeri concreti da mostrare a giugno. Vedi supabase/season-metrics.sql.
//
// UsageDashboard risponde a "come sta andando questa settimana", questa a
// "come è andata la stagione": due domande diverse, due card diverse.
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, font, display } from "../theme";
import { Card, tooltipStyle } from "./ui";
import { supabase } from "../supabaseClient";

const INIZIO_STAGIONE = "2026-09-01";

const ETICHETTE = {
  checkin: "Check-in energia", autovalutazioni: "Autovalutazioni",
  conferme_presenza: "Conferme presenza", messaggi_squadra: "Messaggi in bacheca",
  messaggi_privati: "Messaggi privati", foto: "Foto nell'album",
  momenti: "Momenti del giorno", sondaggi_voti: "Voti ai sondaggi",
  quiz: "Quiz completati", obiettivi: "Obiettivi fissati",
  applausi: "Applausi", bacheca: "Post in bacheca", punti_azione: "Azioni totali",
};
const ETICHETTE_LAVORO = {
  valutazioni_mister: "Valutazioni del mister", stelle: "Stelle assegnate",
  report_ia: "Report generati", pagelloni: "Pagelloni di fine stagione",
  eventi_calendario: "Eventi a calendario", sedute_presenze: "Allenamenti con presenze",
  note_atleta: "Note sulle atlete",
};
const ETICHETTE_EXPORT = {
  share_card: "Card condivise", export_ics: "Eventi nel calendario",
  print_profile: "Profili stampati", print_report: "Report stampati",
};

const fmtGiorno = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

function Blocco({ titolo, voci, etichette, vuoto }) {
  const righe = Object.entries(voci || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (righe.length === 0) return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{titolo}</div>
      <div style={{ ...font, fontSize: 13, color: C.muted }}>{vuoto}</div>
    </div>
  );
  const max = righe[0][1];
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{titolo}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {righe.map(([k, n]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...font, fontSize: 13, color: C.ink, flex: "0 0 160px" }}>{etichette[k] || k}</span>
            <div style={{ flex: 1, height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(n / max) * 100}%`, background: C.orange, borderRadius: 99 }} />
            </div>
            <span style={{ ...display, fontSize: 13, fontWeight: 700, color: C.ink, width: 46, textAlign: "right" }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SeasonStats() {
  const [s, setS] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    supabase.rpc("season_stats", { p_from: INIZIO_STAGIONE }).then(({ data, error }) => {
      if (error) { setUnavailable(true); return; }
      setS(data);
    });
  }, []);

  if (unavailable) {
    return (
      <Card title="Bilancio di stagione" subtitle="Manca la funzione season_stats sul database.">
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>
          Esegui <b>supabase/season-metrics.sql</b> nel SQL Editor, poi ricarica.
        </div>
      </Card>
    );
  }
  if (!s) return null;

  const ad = s.adesione || {};
  const perc = (n) => (ad.atlete ? Math.round((n / ad.atlete) * 100) : 0);
  const serie = (s.serie || []).map((r) => ({ ...r, g: fmtGiorno(r.data) }));

  const Stat = ({ v, tot, label }) => (
    <div style={{ flex: "1 1 130px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ ...display, fontSize: 24, fontWeight: 700, color: C.ink }}>{v}</span>
        {tot != null && <span style={{ ...font, fontSize: 13, color: C.muted }}>/ {tot}</span>}
      </div>
      <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <Card title="Bilancio di stagione"
      subtitle={`Dal 1 settembre a oggi · ${ad.atlete || 0} atlete in rosa`}
      className="a360-noprint">

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Stat v={ad.con_autovalutazione ?? 0} tot={ad.atlete} label={`si sono autovalutate (${perc(ad.con_autovalutazione ?? 0)}%)`} />
        <Stat v={ad.con_app_installata ?? 0} tot={ad.atlete} label="hanno l'app installata" />
        <Stat v={ad.con_notifiche ?? 0} tot={ad.atlete} label="hanno le notifiche attive" />
        <Stat v={s.attivita?.punti_azione ?? 0} label="azioni registrate in stagione" />
      </div>

      {serie.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
            Come si muove nel tempo
          </div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="g" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="attive" name="attive (7gg)" stroke={C.orange} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="app" name="app installata" stroke={C.navy2} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="push" name="notifiche" stroke="#16A6A6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {serie.length <= 1 && (
        <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 16, background: C.surface, borderRadius: 10, padding: "10px 12px", lineHeight: 1.5 }}>
          La curva nel tempo compare fra qualche settimana: la fotografia viene presa ogni lunedì e finora ce n'è {serie.length === 1 ? "una sola" : "nessuna"}.
        </div>
      )}

      <Blocco titolo="Cosa fanno le ragazze" voci={s.attivita} etichette={ETICHETTE} vuoto="Ancora nessuna attività registrata." />
      <Blocco titolo="Cosa è stato prodotto" voci={s.lavoro} etichette={ETICHETTE_LAVORO} vuoto="Ancora niente: manca il primo rilevamento del mister." />
      <Blocco titolo="Condivisioni ed esportazioni" voci={s.esportazioni} etichette={ETICHETTE_EXPORT}
        vuoto="Si contano da oggi: prima di adesso queste azioni non lasciavano traccia." />
    </Card>
  );
}
