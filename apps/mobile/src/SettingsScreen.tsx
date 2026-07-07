import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, THEME_LABELS, ThemeName, themes, useTheme } from "./theme";
import { AuthUser } from "./session";

interface Props {
  user: AuthUser | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onBack: () => void;
}

export default function SettingsScreen({ user, onLogin, onLogout, onBack }: Props) {
  const { colors, name, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const order: ThemeName[] = ["playful", "dark", "minimal"];
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setBusy(true);
    try { await onLogin(); } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Account</Text>
      {user ? (
        <View style={styles.account}>
          <Text style={styles.accountName}>{user.name || user.email}</Text>
          <Text style={styles.muted}>{user.email}</Text>
          <TouchableOpacity style={styles.logout} onPress={onLogout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.muted}>Sign in to sync your progress with the website across devices.</Text>
          <TouchableOpacity style={styles.login} onPress={handleLogin} disabled={busy}>
            {busy
              ? <ActivityIndicator color={colors.onAccent} />
              : <Text style={styles.loginText}>Sign in with Google</Text>}
          </TouchableOpacity>
        </>
      )}

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
  muted: { color: c.muted, fontSize: 14, lineHeight: 20 },
  account: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 16,
  },
  accountName: { fontSize: 17, fontWeight: "700", color: c.text },
  logout: {
    marginTop: 12, borderColor: c.border, borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
  },
  logoutText: { color: c.text, fontWeight: "600" },
  login: {
    marginTop: 12, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  loginText: { color: c.onAccent, fontWeight: "700", fontSize: 15 },
  themeCard: {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12,
  },
  swatches: { flexDirection: "row", gap: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  themeName: { fontSize: 16, fontWeight: "600", color: c.text, flex: 1 },
  active: { color: c.accent, fontWeight: "600", fontSize: 13 },
});
