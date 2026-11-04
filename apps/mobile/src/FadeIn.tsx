import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

// Fades and slides its children in when they first appear. Pass `index` to
// stagger items in a list (each one starts a bit later than the previous).
export default function FadeIn({ children, index = 0, style, from = 14 }: {
  children: ReactNode; index?: number; style?: StyleProp<ViewStyle>; from?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1, duration: 380, delay: Math.min(index, 6) * 45,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [v, index]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
