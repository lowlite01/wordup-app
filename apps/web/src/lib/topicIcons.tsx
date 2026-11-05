import { EXTRA_TOPICS } from "./extraTopics";
// Colourful emoji illustration per topic.
const EMOJI: Record<string, string> = {
  School: "🏫", Technology: "💻", Museum: "🏛️", Travel: "✈️", Business: "💼",
  Nature: "🌿", Food: "🍽️", Sports: "⚽", Emotions: "😊", City: "🏙️",
  Weather: "⛅", Clothes: "👕", Music: "🎵", Animals: "🐾", Law: "⚖️", Health: "🩺",
  Colors: "🎨", Space: "🚀", Family: "🫂", Home: "🏠", Work: "🏢",
};

export function topicEmoji(name: string): string {
  if (EXTRA_TOPICS[name]) return EXTRA_TOPICS[name].emoji;
  return EMOJI[name] || "📘";
}
