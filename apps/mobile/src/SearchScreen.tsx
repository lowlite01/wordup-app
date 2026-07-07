import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Speech from "expo-speech";
import { Colors, useTheme } from "./theme";
import { AppContent, keyLabel, searchWords } from "./api";

interface Props {
  content: AppContent;
}

export default function SearchScreen({ content }: Props) {
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
        {results.slice(0, 60).map(w => (
          <View key={w.key + w.word} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.word}>{w.word}</Text>
              <Text style={styles.pos}>{w.pos}</Text>
              <Text style={styles.tag}>{keyLabel(w.key)}</Text>
            </View>
            <Text style={styles.def}>{w.def}</Text>
            <Text style={styles.example}>{w.example}</Text>
            <TouchableOpacity
              style={styles.speak}
              onPress={() => { Speech.stop(); Speech.speak(w.word, { language: "en-US", rate: 0.9 }); }}
            >
              <Text style={styles.speakText}>🔊 Pronounce</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  word: { fontSize: 17, fontWeight: "700", color: c.text },
  pos: { fontSize: 12, color: c.accent2Strong, textTransform: "uppercase" },
  tag: {
    marginLeft: "auto", backgroundColor: c.accentSoft, color: c.accentStrong,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, overflow: "hidden",
  },
  def: { color: c.text, fontSize: 15, marginTop: 6 },
  example: { color: c.muted, fontStyle: "italic", fontSize: 13, marginTop: 4 },
  speak: {
    alignSelf: "flex-start", marginTop: 10, backgroundColor: c.card2, borderColor: c.border,
    borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
  },
  speakText: { color: c.accentStrong, fontWeight: "600", fontSize: 13 },
});
