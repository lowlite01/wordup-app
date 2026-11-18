import type { Word } from "../types";
import { addWordsToNamedList } from "./customLists";
import { isTelegram, telegramInitData } from "./telegram";

// Words looked up in Reverso on the computer arrive on the server (sent by
// the sync script with the key from /reverso in the bot). On start the app
// collects them into "My lists", one list per part of speech.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const LIST_NAMES: Record<string, string> = {
  noun: "Reverso · Существительные",
  verb: "Reverso · Глаголы",
  adjective: "Reverso · Прилагательные",
  adverb: "Reverso · Наречия",
  phrase: "Reverso · Фразы",
  other: "Reverso · Другое",
};

/** Returns how many new words were added to the lists. */
export async function collectReversoWords(): Promise<number> {
  if (!isTelegram) return 0;
  try {
    const res = await fetch(`${API_URL}/tg/inbox/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `tma ${telegramInitData}` },
    });
    if (!res.ok) return 0;
    const { words } = (await res.json()) as { words: Word[] };
    const byList: Record<string, Word[]> = {};
    for (const w of words) {
      const name = LIST_NAMES[w.pos] || LIST_NAMES.other;
      (byList[name] ||= []).push(w);
    }
    let added = 0;
    for (const [name, list] of Object.entries(byList)) added += addWordsToNamedList(name, list);
    return added;
  } catch {
    return 0; // offline — the words stay on the server until next time
  }
}
