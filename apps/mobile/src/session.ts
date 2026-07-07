import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./api";
import { Progress } from "./storage";

WebBrowser.maybeCompleteAuthSession();

// The deployed website handles Google sign-in; the app opens it, the site
// signs in with the same Google client and redirects back with our JWT.
const WEB_URL = "https://wordup-app-api.vercel.app";
const TOKEN_KEY = "wordup-token";

let token: string | null = null;

export async function loadToken(): Promise<string | null> {
  token = await AsyncStorage.getItem(TOKEN_KEY);
  return token;
}
export function getToken(): string | null {
  return token;
}
async function storeToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export async function login(): Promise<AuthUser | null> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: "wordup", path: "redirect" });
  const authUrl = `${WEB_URL}/?mobileauth=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success" || !result.url) return null;
  // Avoid the URL polyfill — parse the token out of the redirect manually.
  const match = result.url.match(/[?&#]token=([^&#]+)/);
  const t = match ? decodeURIComponent(match[1]) : null;
  if (!t) return null;
  await storeToken(t);
  return me();
}

export async function logout(): Promise<void> {
  await storeToken(null);
}

async function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    await storeToken(null);
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const me = () => authed<AuthUser>("/auth/me");
export const getServerProgress = () => authed<Progress>("/progress");
export const pushWordState = (groupKey: string, word: string, state: "known" | "learning" | "none") =>
  authed("/progress", { method: "PUT", body: JSON.stringify({ groupKey, word, state }) });
export const syncProgress = (entries: { groupKey: string; word: string; state: "known" | "learning" }[]) =>
  authed<Progress>("/progress/sync", { method: "POST", body: JSON.stringify({ entries }) });

export function progressToEntries(p: Progress) {
  const out: { groupKey: string; word: string; state: "known" | "learning" }[] = [];
  for (const [groupKey, words] of Object.entries(p.known)) {
    for (const word of words) out.push({ groupKey, word, state: "known" });
  }
  for (const [groupKey, words] of Object.entries(p.learning)) {
    for (const word of words) out.push({ groupKey, word, state: "learning" });
  }
  return out;
}
