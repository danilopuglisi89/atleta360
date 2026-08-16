// Bacheca personale — vedi supabase/wall.sql. Si accede o passando
// `identifier` (nome atleta, risolto in uid) o `uid` diretto (per la
// bacheca istituzionale dello staff, che non ha un identifier).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { compressImage } from "./photos";

export function useWall({ identifier, uid: ownerUidProp, viewerUid }) {
  const [ownerUid, setOwnerUid] = useState(ownerUidProp || null);
  const [posts, setPosts] = useState(null);       // null = caricamento
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ownerUidProp) { setOwnerUid(ownerUidProp); return; }
    if (!identifier) { setOwnerUid(null); return; }
    supabase.from("profiles").select("id").eq("athlete_id", identifier).maybeSingle()
      .then(({ data }) => setOwnerUid(data?.id || null));
  }, [identifier, ownerUidProp]);

  const load = useCallback(async () => {
    if (!ownerUid) { setPosts([]); return; }
    const { data, error } = await supabase.from("wall_posts").select("*")
      .eq("author_id", ownerUid).order("created_at", { ascending: false }).limit(30);
    if (error) { setUnavailable(true); setPosts([]); return; }
    const rows = data || [];
    const ids = rows.map((p) => p.id);
    let tagsByPost = {}, reactionsByPost = {};
    if (ids.length) {
      const [tg, rx] = await Promise.all([
        supabase.from("wall_post_tags").select("post_id, tagged_user_id, removed").in("post_id", ids),
        supabase.from("wall_post_reactions").select("post_id, user_id").in("post_id", ids),
      ]);
      const taggedIds = [...new Set((tg.data || []).filter((t) => !t.removed).map((t) => t.tagged_user_id))];
      let names = {};
      if (taggedIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", taggedIds);
        (profs || []).forEach((p) => { names[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "?"; });
      }
      (tg.data || []).forEach((t) => {
        if (t.removed) return;
        (tagsByPost[t.post_id] ||= []).push({ userId: t.tagged_user_id, name: names[t.tagged_user_id] || "?", mine: t.tagged_user_id === viewerUid });
      });
      (rx.data || []).forEach((r) => { (reactionsByPost[r.post_id] ||= []).push(r.user_id); });
    }
    setPosts(rows.map((p) => ({
      ...p,
      tags: tagsByPost[p.id] || [],
      reactionCount: (reactionsByPost[p.id] || []).length,
      iReacted: (reactionsByPost[p.id] || []).includes(viewerUid),
    })));
  }, [ownerUid, viewerUid]);
  useEffect(() => { load(); }, [load]);

  // kind: "text" | "photo" | "mood" | "repost"
  const addPost = async (kind, { body, photoFile, moodEmoji, repostKind, repostLabel, repostEmoji, taggedUserIds } = {}) => {
    if (!viewerUid) return "Devi essere collegata per pubblicare.";
    setBusy(true);
    let photo_url = null;
    if (photoFile) {
      try { photo_url = await compressImage(photoFile); }
      catch { setBusy(false); return "Foto non valida."; }
    }
    const { data, error } = await supabase.from("wall_posts").insert({
      author_id: viewerUid, kind,
      body: body?.trim() || null, photo_url, mood_emoji: moodEmoji || null,
      repost_kind: repostKind || null, repost_label: repostLabel || null, repost_emoji: repostEmoji || null,
    }).select("id").single();
    if (error) { setBusy(false); return error.message; }
    if (taggedUserIds?.length) {
      await supabase.from("wall_post_tags").insert(taggedUserIds.map((id) => ({ post_id: data.id, tagged_user_id: id })));
    }
    setBusy(false);
    await load();
    return null;
  };

  const removePost = async (id) => {
    const { error } = await supabase.from("wall_posts").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };

  const removeMyTag = async (postId) => {
    if (!viewerUid) return;
    await supabase.from("wall_post_tags").update({ removed: true }).eq("post_id", postId).eq("tagged_user_id", viewerUid);
    await load();
  };

  const toggleReaction = async (postId, iReacted) => {
    if (!viewerUid) return;
    if (iReacted) await supabase.from("wall_post_reactions").delete().eq("post_id", postId).eq("user_id", viewerUid);
    else await supabase.from("wall_post_reactions").insert({ post_id: postId, user_id: viewerUid });
    await load();
  };

  const isOwner = !!ownerUid && ownerUid === viewerUid;

  return { posts, unavailable, busy, isOwner, ownerUid, addPost, removePost, removeMyTag, toggleReaction, reload: load };
}
