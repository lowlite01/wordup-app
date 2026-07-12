import { useApp } from "../context";
import { useT, type Dict } from "../i18n";
import type { CourseLang, Lang, ThemeName } from "../types";

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

  const courses: { id: CourseLang; label: string }[] = [
    { id: "en", label: `🇬🇧 ${t.courseEnglish}` },
    { id: "de", label: `🇩🇪 ${t.courseGerman}` },
  ];

  return (
    <section>
      <h2 className="screen-title">{t.settingsTitle}</h2>

      <h3 className="settings-group">{t.courseSection}</h3>
      <div className="level-chips">
        {courses.map(c => (
          <button
            key={c.id}
            className={"level-chip" + ((settings.courseLang ?? "en") === c.id ? " active" : "")}
            onClick={() => updateSettings({ courseLang: c.id })}
          >{c.label}</button>
        ))}
      </div>

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

      <h3 className="settings-group">{t.dataSection}</h3>
      <div className="settings-actions">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(t.resetAllConfirm)) resetAllProgress();
          }}
        >{t.resetAll}</button>
        <button
          className="btn"
          onClick={() => {
            if (confirm(t.clearStatsConfirm)) clearStats();
          }}
        >{t.clearStatsBtn}</button>
      </div>
    </section>
  );
}
