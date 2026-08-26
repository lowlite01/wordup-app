import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";

const COLORS = ["#34D399", "#FB923C", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA"];

// A one-shot confetti burst that fills its parent. Pure Animated — no library.
export default function Confetti({ count = 26 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 400,
      duration: 1600 + Math.random() * 1400,
      rotate: Math.floor(Math.random() * 360),
      val: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    pieces.forEach(p =>
      Animated.timing(p.val, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(),
    );
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = p.val.interpolate({ inputRange: [0, 1], outputRange: [-20, height * 0.9] });
        const opacity = p.val.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute", left: p.x, top: 0, width: 8, height: 14, borderRadius: 2,
              backgroundColor: p.color, opacity,
              transform: [{ translateY }, { rotate: `${p.rotate}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}
