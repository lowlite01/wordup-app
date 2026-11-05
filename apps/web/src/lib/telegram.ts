// Telegram Mini App integration. The same website runs both in a normal
// browser and inside Telegram (@WordUpDailyBot); everything here does nothing
// when the page isn't opened from Telegram.

interface TgButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

interface TgWebApp {
  initData: string;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  showConfirm?(message: string, cb: (ok: boolean) => void): void;
  showAlert?(message: string, cb?: () => void): void;
  BackButton: TgButton;
  SettingsButton?: TgButton;
  HapticFeedback?: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

const tg: TgWebApp | null =
  typeof window !== "undefined" && window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null;

/** True when the page runs inside Telegram as a Mini App. */
export const isTelegram = tg !== null;

/** Signed launch data — sent to our API later for "Sign in with Telegram". */
export const telegramInitData = tg?.initData ?? "";

/** Call once on startup: tell Telegram we're ready and use the full height. */
export function initTelegram() {
  if (!tg) return;
  document.documentElement.classList.add("in-telegram");
  tg.ready();
  tg.expand();
  // Stop a downward swipe on a flashcard from closing the whole app.
  if (tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes?.();
}

/** Paint Telegram's own header/background in the current theme colour. */
export function syncTelegramColors() {
  if (!tg || !tg.isVersionAtLeast("6.1")) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!bg.startsWith("#")) return;
  tg.setHeaderColor(bg);
  tg.setBackgroundColor(bg);
  if (tg.isVersionAtLeast("7.10")) tg.setBottomBarColor?.(bg);
}

// One handler at a time for each native button.
let backHandler: (() => void) | null = null;
/** Show Telegram's native "Back" button with this action, or hide it (null). */
export function setTelegramBack(handler: (() => void) | null) {
  if (!tg || !tg.isVersionAtLeast("6.1")) return;
  if (backHandler) tg.BackButton.offClick(backHandler);
  backHandler = handler;
  if (handler) {
    tg.BackButton.onClick(handler);
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

let settingsHandler: (() => void) | null = null;
/** "Settings" item in the Mini App's ⋯ menu. */
export function setTelegramSettings(handler: () => void) {
  if (!tg?.SettingsButton || !tg.isVersionAtLeast("7.0")) return;
  if (settingsHandler) tg.SettingsButton.offClick(settingsHandler);
  settingsHandler = handler;
  tg.SettingsButton.onClick(handler);
  tg.SettingsButton.show();
}

/** Small vibration on answers (does nothing outside Telegram). */
export function haptic(kind: "success" | "error" | "tap") {
  if (!tg?.HapticFeedback || !tg.isVersionAtLeast("6.1")) return;
  if (kind === "tap") tg.HapticFeedback.impactOccurred("light");
  else tg.HapticFeedback.notificationOccurred(kind);
}

// Native browser confirm()/alert() popups are silently blocked inside
// Telegram on iOS (the button "does nothing"), so use Telegram's own popups
// there and the browser's everywhere else.
export function askConfirm(message: string): Promise<boolean> {
  if (tg?.showConfirm && tg.isVersionAtLeast("6.2")) {
    return new Promise(resolve => tg.showConfirm!(message, ok => resolve(ok)));
  }
  return Promise.resolve(window.confirm(message));
}
export function showMessage(message: string) {
  if (tg?.showAlert && tg.isVersionAtLeast("6.2")) tg.showAlert(message);
  else window.alert(message);
}
