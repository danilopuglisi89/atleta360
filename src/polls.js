// Sondaggi rapidi: chiunque approvato può crearne uno (anche le atlete),
// tutti votano un'opzione. Vedi supabase/wave4.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function usePolls(uid) {
  const [polls, setPolls] = useState([]);
  const [votes, setVotes] = useState([]);

  const load = useCallback(async () => {
    const { data: p } = await supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(10);
    setPolls(p || []);
    const ids = (p || []).map((x) => x.id);
    if (ids.length) {
      const { data: v } = await supabase.from("poll_votes").select("*").in("poll_id", ids);
      setVotes(v || []);
    } else setVotes([]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const createPoll = async (question, options) => {
    const { error } = await supabase.from("polls").insert({ question: question.trim(), options, created_by: uid });
    if (error) return error.message;
    await load();
    return null;
  };
  const vote = async (pollId, optionIndex) => {
    const { error } = await supabase.from("poll_votes").upsert(
      { poll_id: pollId, user_id: uid, option_index: optionIndex }, { onConflict: "poll_id,user_id" }
    );
    if (error) return error.message;
    await load();
    return null;
  };
  const removePoll = async (id) => {
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };

  return { polls, votes, createPoll, vote, removePoll };
}
