import { useState } from "react";
import { useApp } from "../context";
import { useT } from "../i18n";
import { TOPICS } from "../lib/groups";
import { BOT_LINK, type ProductId } from "../lib/pro";
import { FREEZE_COST, MAX_FREEZES } from "../lib/dailyPlan";
import { isTelegram, openTelegramLink } from "../lib/telegram";
import Emoji from "./Emoji";

// WordUp Pro paywall + shop (crystal packs, streak freezes).
export default function ProScreen({ onBack }: { onBack: () => void }) {
  const { pro, isPro, purchase, buyFreeze, streak, settings } = useApp();
  const t = useT();
  const introOpen = !pro.introUsed && !isPro;
  const [plan, setPlan] = useState<ProductId>(introOpen ? "pro_week" : "pro_month");
  const [busy, setBusy] = useState(false);
  const locale = settings.lang === "ru" ? "ru-RU" : "en-US";

  const pay = async (p: ProductId) => {
    if (!isTelegram) { openTelegramLink(BOT_LINK); return; }
    setBusy(true);
    try { await purchase(p); } finally { setBusy(false); }
  };

  const benefits: [string, string, string][] = [
    ["🦉", t.proB6, t.proB6d],
    ["❤️", t.proB1, t.proB1d],
    ["📚", t.proB2, t.proB2d(TOPICS.length)],
    ["🎓", t.proB3, t.proB3d],
    ["❄️", t.proB4, t.proB4d],
    ["💎", t.proB5, t.proB5d],
  ];

  return (
    <section className="pro">
      <button className="back-btn" onClick={onBack}>{t.back}</button>

      <div className="pro-hero">
        {introOpen && <span className="pro-gift-badge">{t.proGiftBadge}</span>}
        <Emoji char="👑" className="pro-crown" />
        <h2>{isPro ? t.proActiveTitle : introOpen ? t.proHeroGift : t.proHeroTitle}</h2>
        <p>{pro.admin ? t.proAdmin : isPro && pro.premiumUntil
          ? t.proActive(new Date(pro.premiumUntil).toLocaleDateString(locale))
          : t.proHeroSub}</p>
      </div>

      <div className="pro-benefits">
        {benefits.map(([icon, title, desc], i) => (
          <div key={title} className="pro-benefit" style={{ animationDelay: `${i * 60}ms` }}>
            <Emoji char={icon} className="pro-benefit-icon" />
            <b>{title}</b>
            <span>{desc}</span>
          </div>
        ))}
      </div>

      {!isPro && (
        <div className="pro-plans">
          {introOpen && (
            <button className={"pro-plan" + (plan === "pro_week" ? " sel" : "")} onClick={() => setPlan("pro_week")}>
              <span className="pro-plan-tag">{t.proOnlyNew}</span>
              <span className="pro-radio" />
              <span className="pro-plan-text"><b>{t.proWeek}</b><small>{t.proWeekSub}</small></span>
              <span className="pro-price">{pro.prices.pro_week} <Emoji char="⭐" /></span>
            </button>
          )}
          <button className={"pro-plan" + (plan === "pro_month" ? " sel" : "")} onClick={() => setPlan("pro_month")}>
            <span className="pro-radio" />
            <span className="pro-plan-text"><b>{t.proMonth}</b><small>{t.proMonthSub}</small></span>
            <span className="pro-price">{pro.prices.pro_month} <Emoji char="⭐" /><small>{t.proPerMonth}</small></span>
          </button>
        </div>
      )}

      <button className="today-go pro-pay" disabled={busy} onClick={() => pay(isPro ? "pro_month" : plan)}>
        {!isTelegram ? t.proOpenTelegram
          : isPro ? `${t.proExtend} · ${pro.prices.pro_month} ⭐`
          : t.proPay(pro.prices[plan])}
      </button>
      <p className="pro-note">{isTelegram ? t.proNote : t.proOnlyTelegram}</p>

      <h3 className="pro-shop-title">{t.shopTitle}</h3>
      <div className="pro-shop">
        {(["gems_150", "gems_500"] as ProductId[]).map(p => (
          <button key={p} className="pro-pack" disabled={busy} onClick={() => pay(p)}>
            {p === "gems_500" && <span className="pro-plan-tag">{t.shopBest}</span>}
            <Emoji char="💎" className="pro-pack-icon" />
            <b>{p === "gems_150" ? 150 : 500}</b>
            <span className="pro-pack-price">{pro.prices[p]} <Emoji char="⭐" /></span>
          </button>
        ))}
        <button
          className="pro-pack freeze"
          onClick={() => buyFreeze()}
          disabled={(streak.freezes ?? 0) >= MAX_FREEZES}
        >
          <Emoji char="❄️" className="pro-pack-icon" />
          <b>{t.shopFreeze}</b>
          <small>{t.shopFreezeSub(streak.freezes ?? 0)}</small>
          <span className="pro-pack-price">{FREEZE_COST} <Emoji char="💎" /></span>
        </button>
      </div>
    </section>
  );
}
