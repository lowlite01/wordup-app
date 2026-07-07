import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { Colors, useTheme } from "./theme";
import { cachedEntry, fetchDict, pronounce, youglishUrl } from "./dict";
import { WordCtx, fetchWordContext } from "./wordContext";

export interface WordLite {
  word: string;
  pos?: string;
  def?: string;
  example?: string;
}

interface Props {
  word: WordLite | null;
  onClose: () => void;
  onPickWord: (w: WordLite) => void;
}

export default function WordContextModal({ word, onClose, onPickWord }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [ipa, setIpa] = useState("");
  const [ctx, setCtx] = useState<WordCtx | null>(null);

  useEffect(() => {
    if (!word) return;
    setCtx(null);
    setIpa(cachedEntry(word.word)?.ipa || "");
    let alive = true;
    fetchDict(word.word).then(d => { if (alive && d?.ipa) setIpa(d.ipa); });
    fetchWordContext(word.word, word.pos).then(c => { if (alive) setCtx(c); });
    return () => { alive = false; };
  }, [word]);

  if (!word) return null;

  const empty = ctx && !ctx.phrasal.length && !ctx.colloc.length && !ctx.synonyms.length;

  const Section = ({ title, items, kind }: { title: string; items: string[]; kind: "phrase" | "syn" }) => {
    if (!items.length) return null;
    return (
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.chips}>
          {items.map(text =>
            kind === "phrase" ? (
              <TouchableOpacity key={text} style={styles.chip} onPress={() => Linking.openURL(youglishUrl(text))}>
                <Text style={styles.chipText}>{text}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity key={text} style={styles.chip} onPress={() => onPickWord({ word: text })}>
                <Text style={styles.chipText}>{text}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <ScrollView>
            <View style={styles.head}>
              <Text style={styles.word}>{word.word}</Text>
              {ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
              {word.pos ? <Text style={styles.pos}>{word.pos}</Text> : null}
            </View>
            {word.def ? <Text style={styles.def}>{word.def}</Text> : null}
            {word.example ? <Text style={styles.example}>{word.example}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actBtn} onPress={() => pronounce(word.word)}>
                <Text style={styles.actText}>🔊 Pronounce</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => Linking.openURL(youglishUrl(word.word))}>
                <Text style={styles.actText}>▶ YouTube</Text>
              </TouchableOpacity>
            </View>

            {!ctx && <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />}
            {empty && <Text style={styles.muted}>No extra context found for this word.</Text>}
            {ctx && (
              <>
                <Section title="Phrasal verbs" items={ctx.phrasal} kind="phrase" />
                <Section title="Collocations" items={ctx.colloc} kind="phrase" />
                <Section title="Synonyms" items={ctx.synonyms} kind="syn" />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20,
  },
  card: {
    backgroundColor: c.card, borderRadius: 18, padding: 20, maxHeight: "82%",
    borderColor: c.border, borderWidth: 1,
  },
  close: { position: "absolute", top: 10, right: 12, zIndex: 5, padding: 6 },
  closeText: { color: c.muted, fontSize: 18 },
  head: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8, paddingRight: 24 },
  word: { fontSize: 24, fontWeight: "700", color: c.text },
  ipa: { fontSize: 15, color: c.muted },
  pos: { fontSize: 12, color: c.accent2Strong, textTransform: "uppercase" },
  def: { fontSize: 16, color: c.text, marginTop: 8 },
  example: { fontSize: 14, color: c.muted, fontStyle: "italic", marginTop: 6 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actBtn: {
    backgroundColor: c.card2, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  actText: { color: c.accentStrong, fontWeight: "600", fontSize: 13 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase",
    letterSpacing: 1, marginTop: 18, marginBottom: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: c.card2, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  chipText: { color: c.text, fontSize: 14 },
  muted: { color: c.muted, fontSize: 14, marginTop: 16 },
});
