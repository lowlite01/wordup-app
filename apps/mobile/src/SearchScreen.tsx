import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";
import { AppContent, keyLabel, searchWords } from "./api";
import { cachedEntry, pronounce } from "./dict";
import { WordLite } from "./WordContextModal";

interface Props {
  content: AppContent;
  onOpenWord: (w: WordLite) => void;
}

export default function SearchScreen({ content, onOpenWord }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchWords(content, query), [content, query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search a word in all groups…"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {query.trim().length > 0 && results.length === 0 && (
          <Text style={styles.muted}>No words found for “{query.trim()}”.</Text>
        )}
        {results.slice(0, 60).map(w => {
          const ipa = cachedEntry(w.word)?.ipa;
          return (
            <View key={w.key + w.word} style={styles.row}>
              <View style={styles.rowTop}>
                <TouchableOpacity onPress={() => onOpenWord(w)}>
                  <Text style={styles.word}>{w.word}</Text>
                </TouchableOpacity>
                {ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
                <Text style={styles.pos}>{w.pos}</Text>
                <Text style={styles.tag}>{keyLabel(w.key)}</Text>
              </View>
              <Text style={styles.def}>{w.def}</Text>
              <Text style={styles.example}>{w.example}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.chip} onPress={() => pronounce(w.word)}>
                  <Text style={styles.chipText}>🔊 Pronounce</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip} onPress={() => onOpenWord(w)}>
                  <Text style={styles.chipText}>Context ›</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {results.length > 60 && (
          <Text style={styles.muted}>…and {results.length - 60} more — keep typing to narrow it down.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, color: c.text,
  },
  list: { paddingVertical: 14, paddingBottom: 40 },
  muted: { color: c.muted, fontSize: 14, marginTop: 8 },
  row: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  word: { fontSize: 17, fontWeight: "700", color: c.text, textDecorationLine: "underline" },
  ipa: { fontSize: 13, color: c.muted },
  pos: { fontSize: 12, color: c.accent2Strong, textTransform: "uppercase" },
  tag: {
    marginLeft: "auto", backgroundColor: c.accentSoft, color: c.accentStrong,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, overflow: "hidden",
  },
  def: { color: c.text, fontSize: 15, marginTop: 6 },
  example: { color: c.muted, fontStyle: "italic", fontSize: 13, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: c.card2, borderColor: c.border, borderWidth: 1, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  chipText: { color: c.accentStrong, fontWeight: "600", fontSize: 13 },
});
