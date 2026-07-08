import {
  GraduationCap, Cpu, Landmark, Plane, Briefcase, Leaf, Utensils, Dumbbell,
  Smile, Building2, CloudSun, Shirt, Music, PawPrint, Scale, HeartPulse,
  BookOpen, type LucideIcon,
} from "lucide-react";

// Curated line icons per topic — clean and consistent across the app.
const MAP: Record<string, LucideIcon> = {
  School: GraduationCap,
  Technology: Cpu,
  Museum: Landmark,
  Travel: Plane,
  Business: Briefcase,
  Nature: Leaf,
  Food: Utensils,
  Sports: Dumbbell,
  Emotions: Smile,
  City: Building2,
  Weather: CloudSun,
  Clothes: Shirt,
  Music: Music,
  Animals: PawPrint,
  Law: Scale,
  Health: HeartPulse,
};

export function topicIcon(name: string): LucideIcon {
  return MAP[name] || BookOpen;
}

// Colourful emoji illustration per topic.
const EMOJI: Record<string, string> = {
  School: "🏫", Technology: "💻", Museum: "🏛️", Travel: "✈️", Business: "💼",
  Nature: "🌿", Food: "🍽️", Sports: "⚽", Emotions: "😊", City: "🏙️",
  Weather: "⛅", Clothes: "👕", Music: "🎵", Animals: "🐾", Law: "⚖️", Health: "🩺",
};

export function topicEmoji(name: string): string {
  return EMOJI[name] || "📘";
}
