import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { Colors, useTheme } from "./theme";

interface Props {
  amount: number;
  onDone: () => void;
}

// Floating "+N 💎" toast shown when crystals are earned. Fades in, holds, fades
// out, then calls onDone so the parent can drop it.
export default function CrystalToast({ amount, onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }, [v, onDone]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return (
    <Animated.View style={[styles.toast, { opacity: v, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.text}>🎉 +{amount} 💎</Text>
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
