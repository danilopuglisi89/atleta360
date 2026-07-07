import Chat from "./Chat";
import DirectMessages from "./DirectMessages";
import AdminChatLog from "./AdminChatLog";
import { useAuth } from "./auth";

// Pagina "Chat": in alto i messaggi privati (per le atlete il compositore,
// per l'admin la visione di tutte le conversazioni), sotto la chat di squadra.
export default function ChatPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isAthlete = profile?.category === "atleta";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isAthlete ? <DirectMessages /> : isAdmin ? <AdminChatLog /> : null}
      <Chat />
    </div>
  );
}
