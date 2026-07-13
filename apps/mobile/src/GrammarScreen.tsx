import { useMemo, useState } from "react";
import { LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, UIManager } from "react-native";
import { Colors, useTheme } from "./theme";
import { GRAMMAR } from "./grammar";
import { GRAMMAR_DE } from "./grammar-de";
import { CourseLang } from "./LanguagePicker";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GrammarItem {
  title: string;
  formula: string;
  use: string[];
  signals?: string[];
  examples: [string, string?][];
}
interface GrammarSection {
  section: string;
  items: GrammarItem[];
}

export default function GrammarScreen({ courseLang }: { courseLang: CourseLang }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState<string | null>(null);
  const grammar = courseLang === "de" ? GRAMMAR_DE : GRAMMAR;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => (o === id ? null : id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Grammar guide</Text>
      <Text style={styles.muted}>Tap a rule to expand it.</Text>
      {(grammar as unknown as GrammarSection[]).map(section => (
        <View key={section.section}>
          <Text style={styles.section}>{section.section}</Text>
          {section.items.map(item => {
            const id = section.section + "|" + item.title;
            const isOpen = open === id;
            return (
              <View key={id} style={styles.card}>
                <TouchableOpacity style={styles.head} onPress={() => toggle(id)} activeOpacity={0.7}>
                  <Text style={styles.headTitle}>{item.title}</Text>
                  <Text style={styles.chev}>{isOpen ? "▲" : "▾"}</Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.body}>
                    <Text style={styles.formula}>{item.formula}</Text>
                    {item.use.map(u => (
                      <Text key={u} style={styles.bullet}>• {u}</Text>
                    ))}
                    {item.signals && (
                      <Text style={styles.signals}>Signal words: {item.signals.join(", ")}</Text>
                    )}
                    {item.examples.map(([en, note]) => (
                      <Text key={en} style={styles.example}>
                        “{en}”{note ? <Text style={styles.note}> — {note}</Text> : null}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: c.text },
  muted: { color: c.muted, fontSize: 14, marginTop: 2, marginBottom: 8 },
  section: {
    fontSize: 13, fontWeight: "600", color: c.muted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 20, marginBottom: 10,
  },
  card: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, marginBottom: 10,
    overflow: "hidden",
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  headTitle: { fontSize: 16, fontWeight: "600", color: c.text, flex: 1 },
  chev: { color: c.muted, fontSize: 12 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
  formula: {
    backgroundColor: c.card2, color: c.accentStrong, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10,
  },
  bullet: { color: c.text, fontSize: 15, marginBottom: 4 },
  signals: { color: c.muted, fontSize: 13, marginTop: 6, marginBottom: 6 },
  example: { color: c.text, fontStyle: "italic", fontSize: 14, marginTop: 6 },
  note: { color: c.muted, fontStyle: "normal", fontSize: 13 },
});
