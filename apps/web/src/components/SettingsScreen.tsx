import { useState } from "react";
import { useApp } from "../context";
import { useT, type Dict } from "../i18n";
import type { Lang, ThemeName } from "../types";
import ProfileScreen from "./ProfileScreen";
import { askConfirm, isTelegram } from "../lib/telegram";
import { connectLinkKey, disconnectLinkKey, linkKey } from "../lib/account";

// Website only: use the Telegram account's progress with the key from /reverso.
function TelegramLink() {
  const t = useT();
  const connected = Boolean(linkKey());
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setBusy(true);
    setError("");
    const result = await connectLinkKey(key);
    setBusy(false);
    if (result === "ok") window.location.reload(); // start again with the account's data
    else setError(result === "bad" ? t.linkBad : t.linkOffline);
  };

  return (
    <>
      <h3 className="settings-group">{t.linkSection}</h3>
      {connected ? (
        <div className="link-box">
          <p className="link-ok">✓ {t.linkConnected}</p>
          <button className="btn" onClick={() => { disconnectLinkKey(); window.location.reload(); }}>
            {t.linkDisconnect}
          </button>
        </div>
      ) : (
        <div className="link-box">
          <p className="import-hint">{t.linkHint}</p>
          <div className="link-row">
            <input
              className="import-name"
              placeholder={t.linkPlaceholder}
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && key.trim()) void connect(); }}
              aria-label={t.linkPlaceholder}
            />
            <button className="btn primary" disabled={busy || !key.trim()} onClick={connect}>
              {t.linkConnect}
            </button>
          </div>
          {error && <p className="link-error">{error}</p>}
        </div>
      )}
    </>
  );
}

const THEME_META: { id: ThemeName; name: (t: Dict) => string; desc: (t: Dict) => string; swatches: string[] }[] = [
  {
    id: "midnight",
    name: t => t.themeMidnight,
    desc: t => t.themeMidnightDesc,
    swatches: ["#0E0E13", "#34D399", "#23232E"],
  },
  {
    id: "playful",
    name: t => t.themePlayful,
    desc: t => t.themePlayfulDesc,
    swatches: ["#FDF6EC", "#1D9E75", "#EF9F27"],
  },
  {
    id: "dark",
    name: t => t.themeDark,
    desc: t => t.themeDarkDesc,
    swatches: ["#14141F", "#7F77DD", "#26263A"],
  },
  {
    id: "minimal",
    name: t => t.themeMinimal,
    desc: t => t.themeMinimalDesc,
    swatches: ["#FAFAF7", "#185FA5", "#E3E3DC"],
  },
];

const LANGS: { id: Lang; label: string }[] = [
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

export default function SettingsScreen() {
  const { settings, updateSettings, resetAllProgress, clearStats } = useApp();
  const t = useT();

  return (
    <section>
      <h2 className="screen-title">{t.settingsTitle}</h2>

      <ProfileScreen embedded />

      <h3 className="settings-group">{t.langSection}</h3>
      <div className="level-chips">
        {LANGS.map(l => (
          <button
            key={l.id}
            className={"level-chip" + (settings.lang === l.id ? " active" : "")}
            onClick={() => updateSettings({ lang: l.id })}
          >{l.label}</button>
        ))}
      </div>

      <h3 className="settings-group">{t.themeSection}</h3>
      <div className="theme-cards">
        {THEME_META.map(m => (
          <button
            key={m.id}
            className={"theme-card" + (settings.theme === m.id ? " active" : "")}
            onClick={() => updateSettings({ theme: m.id })}
          >
            <span className="theme-swatches">
              {m.swatches.map(c => (
                <span key={c} className="swatch" style={{ background: c }} />
              ))}
            </span>
            <span className="theme-name">{m.name(t)}</span>
            <span className="theme-desc">{m.desc(t)}</span>
            {settings.theme === m.id && <span className="theme-check">{t.activeTheme}</span>}
          </button>
        ))}
      </div>

      <h3 className="settings-group">{t.soundSection}</h3>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={settings.autoSpeak}
          onChange={e => updateSettings({ autoSpeak: e.target.checked })}
        />
        <span>{t.autoSpeakLabel}</span>
      </label>

      {!isTelegram && <TelegramLink />}

      <h3 className="settings-group">{t.dataSection}</h3>
      <div className="settings-actions">
        <button
          className="btn danger"
          onClick={() => {
            askConfirm(t.resetAllConfirm).then(ok => { if (ok) resetAllProgress(); });
          }}
        >{t.resetAll}</button>
        <button
          className="btn"
          onClick={() => {
            askConfirm(t.clearStatsConfirm).then(ok => { if (ok) clearStats(); });
          }}
        >{t.clearStatsBtn}</button>
      </div>
    </section>
  );
}
