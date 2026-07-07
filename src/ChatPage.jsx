import Chat from "./Chat";
import DirectMessages from "./DirectMessages";
import { useAuth } from "./auth";

// Pagina "Chat": in alto i messaggi privati (compositore, anche per l'admin),
// sotto la chat di squadra. Il log completo delle chat private è nel menu Admin.
export default function ChatPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isAthlete = profile?.category === "atleta";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {(isAthlete || isAdmin) && <DirectMessages />}
      <Chat />
    </div>
  );
}
