// Canzone della settimana + playlist pre-partita: identità di squadra a
// costo minimo, nessuna rotazione a turni da gestire — chi vuole propone,
// l'ultima proposta della settimana vince.
import { useState } from "react";
import { Music, ListMusic, Edit3 } from "lucide-react";
import { C, font, display } from "../theme";
import { useTeamSettings } from "../rituals";

export default function WeekSongCard() {
  const { weekSong, setWeekSong, playlistUrl, setPlaylistUrl } = useTeamSettings();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState(false);
  const [urlDraft, setUrlDraft] = useState(playlistUrl);

  const submitSong = async () => {
    if (!title.trim()) return;
    await setWeekSong(title.trim(), artist.trim());
    setTitle(""); setArtist(""); setEditing(false);
  };

  if (!weekSong && !editing && !playlistUrl) {
    return (
      <button onClick={() => setEditing(true)} className="a360-noprint"
        style={{ ...font, display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
          background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
        <Music size={15} color={C.orange} /> <span style={{ fontSize: 12.5, color: C.muted }}>Proponi la canzone della settimana</span>
      </button>
    );
  }

  return (
    <div className="a360-noprint" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
      {editing ? (
        <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 220 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="titolo" style={{ ...font, fontSize: 12.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "6px 9px", flex: 1 }} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="artista" style={{ ...font, fontSize: 12.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "6px 9px", flex: 1 }} />
          <button onClick={submitSong} style={{ ...font, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", cursor: "pointer" }}>Ok</button>
        </div>
      ) : weekSong ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <Music size={15} color={C.orange} style={{ flexShrink: 0 }} />
          <span style={{ ...font, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{weekSong.title}</b>{weekSong.artist ? ` · ${weekSong.artist}` : ""}
          </span>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}><Edit3 size={13} /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ ...font, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Music size={15} color={C.orange} /> Proponi la canzone della settimana
        </button>
      )}

      {editingPlaylist ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="link playlist Spotify" style={{ ...font, fontSize: 12.5, border: `1px solid ${C.grid}`, borderRadius: 8, padding: "6px 9px", width: 180 }} />
          <button onClick={() => { setPlaylistUrl(urlDraft); setEditingPlaylist(false); }} style={{ ...font, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>Ok</button>
        </div>
      ) : playlistUrl ? (
        <a href={playlistUrl} target="_blank" rel="noopener noreferrer" style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.navy2, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
          <ListMusic size={14} /> Playlist
        </a>
      ) : (
        <button onClick={() => setEditingPlaylist(true)} style={{ ...font, fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <ListMusic size={14} /> aggiungi playlist
        </button>
      )}
    </div>
  );
}
