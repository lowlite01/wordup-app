import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useApp } from "../context";
import { useT } from "../i18n";
import { GOOGLE_CLIENT_ID, type LeaderRow } from "../lib/api";

export default function ProfileScreen() {
  const { user, gamification, loginWithGoogle, logout, loadLeaderboard } = useApp();
  const t = useT();
  const [board, setBoard] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) loadLeaderboard().then(setBoard).catch(() => setBoard([]));
  }, [user, loadLeaderboard]);

  if (!user) {
    return (
      <section>
        <h2 className="screen-title">{t.profileTitle}</h2>
        <p className="muted">{t.loginPitch}</p>
        {GOOGLE_CLIENT_ID ? (
          <div className="login-box">
            <GoogleLogin
              onSuccess={async cred => {
                setError("");
                try {
                  if (cred.credential) await loginWithGoogle(cred.credential);
                } catch {
                  setError(t.loginError);
                }
              }}
              onError={() => setError(t.loginError)}
            />
            {error && <p className="mic-feedback bad">{error}</p>}
          </div>
        ) : (
          <p className="muted">{t.loginNotConfigured}</p>
        )}
      </section>
    );
  }

  const g = gamification;
  return (
    <section>
      <h2 className="screen-title">{t.profileTitle}</h2>

      <div className="profile-head">
        {user.avatarUrl
          ? <img className="profile-avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
          : <div className="profile-avatar placeholder">👤</div>}
        <div>
          <div className="profile-name">{user.name || user.email}</div>
          <div className="muted">{user.email}</div>
        </div>
        <button className="btn" onClick={logout}>{t.logout}</button>
      </div>

      {g && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-num">{g.level}</span>
              <span className="stat-label">{t.levelWord}</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{g.xp}</span>
              <span className="stat-label">XP</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">🔥 {g.streak}</span>
              <span className="stat-label">{t.streakWord}</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{g.knownCount}</span>
              <span className="stat-label">{t.knownWord}</span>
            </div>
          </div>

          <div className="xp-bar-wrap">
            <div className="xp-bar">
              <span style={{ width: `${Math.round((g.levelXp / g.levelSpan) * 100)}%` }} />
            </div>
            <span className="muted xp-bar-label">
              {t.xpToNext(g.levelSpan - g.levelXp, g.level + 1)}
            </span>
          </div>

          <h3 className="settings-group">{t.achievementsTitle}</h3>
          <div className="ach-grid">
            {g.achievements.length === 0 && <p className="muted">{t.noAchievements}</p>}
            {g.achievements.map(a => (
              <div className="ach-card" key={a.id} title={a.description}>
                <span className="ach-icon">{a.icon}</span>
                <span className="ach-title">{a.title}</span>
              </div>
            ))}
          </div>

          <h3 className="settings-group">{t.leaderboardTitle}</h3>
          <div className="leader-list">
            {board === null && <p className="muted">{t.loading}</p>}
            {board?.map(row => (
              <div className={"leader-row" + (row.name === (user.name || null) ? " me" : "")} key={row.rank}>
                <span className="leader-rank">{row.rank}</span>
                {row.avatarUrl
                  ? <img className="leader-avatar" src={row.avatarUrl} alt="" referrerPolicy="no-referrer" />
                  : <span className="leader-avatar placeholder">👤</span>}
                <span className="leader-name">{row.name || "—"}</span>
                <span className="leader-xp">{t.levelShort} {row.level} · {row.xp} XP</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
