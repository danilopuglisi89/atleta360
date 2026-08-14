// Genera un file .ics per un evento e lo scarica: finisce nel calendario
// personale del telefono (Google/Apple) con "Aggiungi al calendario".
// Nessuna libreria: il formato iCalendar per un evento singolo è poche righe.
const pad = (n) => String(n).padStart(2, "0");
const toICSDate = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function downloadEventICS(ev, titlePrefix = "") {
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : new Date(start.getTime() + 90 * 60000);
  const summary = `${titlePrefix}${ev.title || ""}`.trim() || (ev.kind === "match" ? "Partita" : ev.kind === "training" ? "Allenamento" : "Evento");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Atleta360//Calendario//IT",
    "BEGIN:VEVENT",
    `UID:${ev.id}@atleta360`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${summary.replace(/\n/g, " ")}`,
    ev.location ? `LOCATION:${ev.location.replace(/\n/g, " ")}` : null,
    ev.notes ? `DESCRIPTION:${ev.notes.replace(/\n/g, " ")}` : null,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${summary.replace(/[^\w\-]+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
