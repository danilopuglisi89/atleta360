// Classifica del girone di campionato, dal sito FIPAV (supabase/fipav.sql,
// aggiornata ogni ora da ops/sync-fipav.mjs sul server). Si nasconde da
// sola se la tabella non esiste ancora o è vuota.
import { useEffect, useState } from "react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";

const fmtGiorno = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

export default function LeagueTableCard() {
  const [tables, setTables] = useState([]);
  useEffect(() => {
    let vivo = true;
    supabase.from("league_tables").select("girone_id,title,teams,updated_at").then(({ data, error }) => {
      if (vivo && !error) setTables((data || []).filter((t) => (t.teams || []).length));
    });
    return () => { vivo = false; };
  }, []);

  return tables.map((t) => {
    const giocate = t.teams.some((s) => s.played > 0);
    const th = { ...font, fontSize: 11, fontWeight: 700, color: C.muted, textAlign: "right", padding: "0 0 6px 8px" };
    const td = { ...font, fontSize: 13, color: C.ink, textAlign: "right", padding: "7px 0 7px 8px", borderTop: `1px solid ${C.grid}` };
    return (
      <Card key={t.girone_id} id="a360-girone" title="Il nostro girone"
        subtitle={`${t.title || "Campionato"} · dati FIPAV${giocate ? ` · aggiornata il ${fmtGiorno(t.updated_at)}` : ""}`}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", paddingLeft: 0 }}>Squadra</th>
              <th style={th}>Pt</th><th style={th}>G</th><th style={th}>V</th><th style={th}>P</th><th style={th}>Set</th>
            </tr>
          </thead>
          <tbody>
            {t.teams.map((s) => {
              const nostra = s.us ? { color: C.orange, fontWeight: 700 } : {};
              return (
                <tr key={s.name}>
                  <td style={{ ...td, textAlign: "left", paddingLeft: 0, ...nostra }}>
                    <span style={{ ...display, display: "inline-block", width: 20, color: C.muted, fontWeight: 700 }}>{s.pos}</span>
                    {s.name}
                  </td>
                  <td style={{ ...td, fontWeight: 700, ...nostra }}>{s.pts}</td>
                  <td style={td}>{s.played}</td>
                  <td style={td}>{s.won}</td>
                  <td style={td}>{s.lost}</td>
                  <td style={td}>{s.setsWon}-{s.setsLost}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!giocate && (
          <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 10 }}>
            Il campionato non è ancora iniziato: la classifica si muove dalla prima giornata.
          </div>
        )}
      </Card>
    );
  });
}
