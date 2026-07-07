import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Colors {
  bg: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accent2: string;
  accent2Soft: string;
  accent2Strong: string;
  danger: string;
  dangerSoft: string;
  success: string;
  onAccent: string;
}

export type ThemeName = "playful" | "dark" | "minimal";

export const themes: Record<ThemeName, Colors> = {
  playful: {
    bg: "#FDF6EC", card: "#FFFFFF", card2: "#F2FAF6", text: "#22302A", muted: "#7D8A80",
    border: "#E8DDC6", accent: "#1D9E75", accentStrong: "#0F6E56", accentSoft: "#E1F5EE",
    accent2: "#EF9F27", accent2Soft: "#FAEEDA", accent2Strong: "#854F0B",
    danger: "#D85A30", dangerSoft: "#FAECE7", success: "#1D9E75", onAccent: "#FFFFFF",
  },
  dark: {
    bg: "#14141F", card: "#1E1E2C", card2: "#26263A", text: "#ECECF4", muted: "#8D8DA8",
    border: "#34344A", accent: "#7F77DD", accentStrong: "#AFA9EC", accentSoft: "#26263A",
    accent2: "#FAC775", accent2Soft: "#2E2A24", accent2Strong: "#FAC775",
    danger: "#E24B4A", dangerSoft: "#34222A", success: "#5DCAA5", onAccent: "#FFFFFF",
  },
  minimal: {
    bg: "#FAFAF7", card: "#FFFFFF", card2: "#F4F8FC", text: "#26261F", muted: "#77776E",
    border: "#E3E3DC", accent: "#185FA5", accentStrong: "#0C447C", accentSoft: "#E6F1FB",
    accent2: "#BA7517", accent2Soft: "#FAEEDA", accent2Strong: "#854F0B",
    danger: "#A32D2D", dangerSoft: "#FCEBEB", success: "#3B6D11", onAccent: "#FFFFFF",
  },
};

export const THEME_LABELS: Record<ThemeName, string> = {
  playful: "Playful & bright",
  dark: "Dark premium",
  minimal: "Light minimal",
};

interface Ctx {
  name: ThemeName;
  colors: Colors;
  setTheme: (n: ThemeName) => void;
}

const ThemeContext = createContext<Ctx>({ name: "playful", colors: themes.playful, setTheme: () => {} });
const KEY = "wordup-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>("playful");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => {
      if (v && v in themes) setName(v as ThemeName);
    });
  }, []);

  const setTheme = (n: ThemeName) => {
    setName(n);
    AsyncStorage.setItem(KEY, n);
  };

  return (
    <ThemeContext.Provider value={{ name, colors: themes[name], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
