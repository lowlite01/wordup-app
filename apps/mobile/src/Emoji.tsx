import { useState } from "react";
import { Image, Text, type ImageStyle, type StyleProp } from "react-native";

// 3D emoji from Microsoft's open-source Fluent Emoji set (MIT licence), the
// same pictures the website uses, pinned to one commit. Looks identical on
// iPhone and Android. Falls back to the system emoji if the image can't load.
// NOTE: keep NAMES in sync with apps/web/src/components/Emoji.tsx.
const BASE =
  "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets";

const NAMES: Record<string, string> = {
  "🔥": "Fire", "💎": "Gem stone", "🔒": "Locked", "🏫": "School", "💻": "Laptop",
  "🏛️": "Classical building", "✈️": "Airplane", "💼": "Briefcase", "🌿": "Herb",
  "🍽️": "Fork and knife with plate", "⚽": "Soccer ball", "😊": "Smiling face with smiling eyes",
  "🏙️": "Cityscape", "⛅": "Sun behind cloud", "👕": "T-shirt", "🎵": "Musical note",
  "🐾": "Paw prints", "⚖️": "Balance scale", "🩺": "Stethoscope", "🎨": "Artist palette",
  "🚀": "Rocket", "🏠": "House", "🏢": "Office building", "📘": "Blue book", "🫂": "People hugging",
  "🗂️": "Card index dividers", "❓": "Red question mark", "📋": "Clipboard",
  "🔊": "Speaker high volume", "🎤": "Studio microphone", "👤": "Bust in silhouette", "⚙️": "Gear",
  "🎉": "Party popper", "📝": "Memo", "✨": "Sparkles", "🎯": "Bullseye", "✅": "Check mark button",
  "📚": "Books", "🎓": "Graduation cap", "📊": "Bar chart", "🧩": "Puzzle piece",
  "📈": "Chart increasing", "🛠️": "Hammer and wrench", "🧠": "Brain",
  "🌍": "Globe showing europe-africa", "💬": "Speech balloon", "💡": "Light bulb", "📖": "Open book",
};

export function emojiUrl(char: string): string | null {
  const name = NAMES[char];
  if (!name) return null;
  const file = name.toLowerCase().replace(/ /g, "_");
  return `${BASE}/${encodeURIComponent(name)}/3D/${file}_3d.png`;
}

interface Props {
  char: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function Emoji({ char, size = 20, style }: Props) {
  const [failed, setFailed] = useState(false);
  const url = emojiUrl(char);
  if (!url || failed) return <Text style={{ fontSize: size * 0.85, lineHeight: size * 1.1 }}>{char}</Text>;
  return (
    <Image
      source={{ uri: url }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityLabel={char}
    />
  );
}
