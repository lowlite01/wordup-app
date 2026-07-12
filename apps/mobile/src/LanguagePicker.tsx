import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, useTheme } from "./theme";

export type CourseLang = "en" | "de";

interface Props {
  onPick: (lang: CourseLang) => void;
}

const COURSES: { id: CourseLang; flag: string; name: string; sub: string }[] = [
  { id: "en", flag: "🇬🇧", name: "English", sub: "Vocabulary by CEFR level & topic" },
  { id: "de", flag: "🇩🇪", name: "Deutsch", sub: "Alphabet, articles, numbers & basics" },
];

// First-launch screen: choose which vocabulary course to study.
export default function LanguagePicker({ onPick }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <Text style={styles.logo}>WordUp</Text>
      <Text style={styles.title}>Choose your course</Text>
      <Text style={styles.sub}>Which language do you want to learn? You can switch anytime in Settings.</Text>
      <View style={styles.cards}>
        {COURSES.map(c => (
          <TouchableOpacity key={c.id} style={styles.card} activeOpacity={0.85} onPress={() => onPick(c.id)}>
            <Text style={styles.flag}>{c.flag}</Text>
            <View style={styles.mid}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.cardSub}>{c.sub}</Text>
            </View>
            <Text style={styles.go}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  root: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logo: { fontSize: 34, fontWeight: "800", color: c.accent, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "700", color: c.text, textAlign: "center", marginTop: 18 },
  sub: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 8, marginBottom: 26, lineHeight: 20 },
  cards: { gap: 14 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, padding: 18,
  },
  flag: { fontSize: 34 },
  mid: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: c.text },
  cardSub: { fontSize: 13, color: c.muted, marginTop: 3 },
  go: { fontSize: 26, fontWeight: "800", color: c.accentStrong },
});
