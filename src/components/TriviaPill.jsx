import { Lightbulb } from "lucide-react";
import { C, font } from "../theme";
import { triviaOfTheDay } from "../trivia";

export default function TriviaPill() {
  return (
    <div className="a360-noprint" style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 99, padding: "8px 14px", marginBottom: 16 }}>
      <Lightbulb size={15} color={C.orange} style={{ flexShrink: 0 }} />
      <span style={{ ...font, fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>{triviaOfTheDay()}</span>
    </div>
  );
}
