import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, THEME_LABELS, ThemeName, themes, useTheme } from "./theme";

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const { colors, name, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const order: ThemeName[] = ["playful", "dark", "minimal"];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Theme</Text>
      {order.map(key => {
        const t = themes[key];
        const active = name === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.themeCard, active && { borderColor: colors.accent, borderWidth: 2 }]}
            onPress={() => setTheme(key)}
            activeOpacity={0.8}
          >
            <View style={styles.swatches}>
              <View style={[styles.swatch, { backgroundColor: t.bg }]} />
              <View style={[styles.swatch, { backgroundColor: t.accent }]} />
              <View style={[styles.swatch, { backgroundColor: t.card2 }]} />
            </View>
            <Text style={styles.themeName}>{THEME_LABELS[key]}</Text>
            {active && <Text style={styles.active}>✓ Active</Text>}
          </TouchableOpacity>
        );
      })}

      <Text style={styles.section}>Account</Text>
      <Text style={styles.muted}>Google sign-in and progress sync with the website are coming next.</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  back: { color: c.muted, fontSize: 15, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "700", color: c.text, marginBottom: 8 },
  section: {
    fontSize: 13, fontWeight: "600", color: c.muted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 20, marginBottom: 10,
  },
  themeCard: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12,
  },
  swatches: { flexDirection: "row", gap: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  themeName: { fontSize: 16, fontWeight: "600", color: c.text, flex: 1 },
  active: { color: c.accent, fontWeight: "600", fontSize: 13 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
});
