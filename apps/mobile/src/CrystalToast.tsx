import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { Colors, useTheme } from "./theme";

interface Props {
  amount: number;
  text?: string; // custom message (e.g. "🔥 3 · +5 💎"); defaults to "🎉 +N 💎"
  onDone: () => void;
}

// Floating "+N 💎" toast shown when crystals are earned. Fades in, holds, fades
// out, then calls onDone so the parent can drop it.
export default function CrystalToast({ amount, text, onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const v = useRef(new Animated.Value(0)).current;

  // Run once per toast. (onDone is a new function on every parent render, so
  // depending on it would restart the animation.)
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => doneRef.current());
  }, [v]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return (
    <Animated.View style={[styles.toast, { opacity: v, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.text}>{text ?? `🎉 +${amount} 💎`}</Text>
    </Animated.View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  toast: {
    position: "absolute", bottom: 90, alignSelf: "center",
    backgroundColor: c.card, borderColor: c.accent, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 22, paddingVertical: 12,
    shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  text: { color: c.text, fontWeight: "800", fontSize: 16 },
});
