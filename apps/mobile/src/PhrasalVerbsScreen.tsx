import { useMemo, useState } from "react";
import {
  LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View,
} from "react-native";
import { Colors, useTheme } from "./theme";
import { Progress, knownCount } from "./storage";
import { PHRASAL_VERBS, pvKey } from "./phrasalVerbs";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  progress: Progress;
  onStart: (key: string, mode: "flash" | "quiz") => void;
}

export default function PhrasalVerbsScreen({ progress, onStart }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState<string | null>(PHRASAL_VERBS[0]?.verb ?? null);

  const toggle = (verb: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => (o === verb ? null : verb));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Phrasal verbs</Text>
      <Text style={styles.muted}>Common English phrasal verbs, grouped by base verb. Tap a group to see them, then practise.</Text>

      {PHRASAL_VERBS.map(group => {
        const key = pvKey(group.verb);
        const total = group.items.length;
        const known = knownCount(progress, key);
        const isOpen = open === group.verb;
        return (
          <View key={group.verb} style={styles.card}>
            <TouchableOpacity style={styles.head} onPress={() => toggle(group.verb)} activeOpacity={0.7}>
              <Text style={styles.verb}>{group.verb}</Text>
              <Text style={styles.count}>{known ? `${known} / ${total}` : `${total} verbs`}</Text>
              <Text style={styles.chev}>{isOpen ? "▾" : "›"}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.body}>
                {group.items.map(w => (
                  <View key={w.word} style={styles.item}>
                    <Text style={styles.word}>{w.word}</Text>
                    <Text style={styles.def}>{w.def}</Text>
                    <Text style={styles.example}>“{w.example}”</Text>
                  </View>
                ))}
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => onStart(key, "flash")} activeOpacity={0.85}>
                    <Text style={styles.btnPrimaryText}>🃏 Flashcards</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={() => onStart(key, "quiz")} activeOpacity={0.85}>
                    <Text style={styles.btnText}>❓ Quiz</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: c.text },
  muted: { color: c.muted, fontSize: 14, marginTop: 2, marginBottom: 10, lineHeight: 20 },
  card: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12,
    marginBottom: 10, overflow: "hidden",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  verb: { flex: 1, fontSize: 16, fontWeight: "700", color: c.text },
  count: { color: c.muted, fontSize: 13 },
  chev: { color: c.muted, fontSize: 16 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  item: { paddingVertical: 10, borderTopColor: c.border, borderTopWidth: 1 },
  word: { color: c.accentStrong, fontWeight: "700", fontSize: 15 },
  def: { color: c.text, fontSize: 14, marginTop: 2 },
  example: { color: c.muted, fontSize: 13, fontStyle: "italic", marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  btn: {
    flex: 1, borderColor: c.border, borderWidth: 1, borderRadius: 10,
    paddingVertical: 11, alignItems: "center",
  },
  btnText: { color: c.text, fontWeight: "700", fontSize: 14 },
  btnPrimary: { backgroundColor: c.accent, borderColor: c.accent },
  btnPrimaryText: { color: c.onAccent, fontWeight: "700", fontSize: 14 },
});
