import { useState } from "react";

// 3D emoji from Microsoft's open-source Fluent Emoji set (MIT licence),
// pinned to one commit so the pictures never change unexpectedly.
// Same look on every device (Windows, iPhone, Android). If the image can't
// load (e.g. offline), the normal system emoji is shown instead.
const BASE =
  "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets";

// emoji character -> Fluent asset folder name
const NAMES: Record<string, string> = {
  "🔥": "Fire",
  "💎": "Gem stone",
  "🔒": "Locked",
  "🏫": "School",
  "💻": "Laptop",
  "🏛️": "Classical building",
  "✈️": "Airplane",
  "💼": "Briefcase",
  "🌿": "Herb",
  "🍽️": "Fork and knife with plate",
  "⚽": "Soccer ball",
  "😊": "Smiling face with smiling eyes",
  "🏙️": "Cityscape",
  "⛅": "Sun behind cloud",
  "👕": "T-shirt",
  "🎵": "Musical note",
  "🐾": "Paw prints",
  "⚖️": "Balance scale",
  "🩺": "Stethoscope",
  "🎨": "Artist palette",
  "🚀": "Rocket",
  "🏠": "House",
  "🏢": "Office building",
  "📘": "Blue book",
  "🫂": "People hugging",
  "🗂️": "Card index dividers",
  "❓": "Red question mark",
  "📋": "Clipboard",
  "🔊": "Speaker high volume",
  "🎤": "Studio microphone",
  "👤": "Bust in silhouette",
  "⚙️": "Gear",
  "🎉": "Party popper",
  "📝": "Memo",
  "✨": "Sparkles",
  "🎯": "Bullseye",
  "✅": "Check mark button",
  "📚": "Books",
  "🎓": "Graduation cap",
};

export function emojiUrl(char: string): string | null {
  const name = NAMES[char];
  if (!name) return null;
  const file = name.toLowerCase().replace(/ /g, "_");
  return `${BASE}/${encodeURIComponent(name)}/3D/${file}_3d.png`;
}

interface Props {
  char: string;          // the emoji, e.g. "🔥"
  size?: number | string; // CSS size, default 1em (scales with font-size)
  className?: string;
}

export default function Emoji({ char, size = "1em", className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const url = emojiUrl(char);
  if (!url || failed) return <span className={"emoji-fallback " + className}>{char}</span>;
  return (
    <img
      className={"emoji-3d " + className}
      src={url}
      alt={char}
      draggable={false}
      loading="lazy"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
