import Chat from "./Chat";
import DirectMessages from "./DirectMessages";
import { useAuth } from "./auth";

// Pagina "Chat": per le atlete, in alto i messaggi privati; sotto la chat di
// squadra. Per l'admin solo la chat di squadra (il log completo è nel menu Admin).
export default function ChatPage() {
  const { profile } = useAuth();
  const isAthlete = profile?.category === "atleta";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isAthlete && <DirectMessages />}
      <Chat />
    </div>
  );
}
