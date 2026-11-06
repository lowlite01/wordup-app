import { useApp } from "../context";
import { useT } from "../i18n";
import { FREEZE_COST } from "../lib/dailyPlan";
import Emoji from "./Emoji";

interface Props {
  missed: number;              // days missed
  onFreeze: () => void;        // spend freezes in stock
  onBuyAndFreeze: (cost: number) => void; // buy the missing freezes with crystals, then spend
  onPro: () => void;
  onLetGo: () => void;         // start the streak from zero
}

// Shown on opening the app after a missed day: save the streak with a freeze
// (or buy one), or let it go. Nothing is spent without asking.
export default function StreakRescueModal({ missed, onFreeze, onBuyAndFreeze, onPro, onLetGo }: Props) {
  const { streak, crystals, isPro } = useApp();
  const t = useT();
  const have = streak.freezes ?? 0;
  const need = Math.max(0, missed - have);
  const cost = need * FREEZE_COST;

  return (
    <div className="modal-backdrop hearts-backdrop">
      <div className="hearts-modal streak-rescue">
        <div className="streak-rescue-icons">
          <Emoji char="🔥" className="streak-rescue-fire" />
          <Emoji char="❄️" className="streak-rescue-ice" />
        </div>
        <h2>{t.rescueTitle(streak.count)}</h2>
        <p className="muted">{t.rescueSub(missed, have)}</p>
        {need === 0 ? (
          <button className="today-go rescue-ice" onClick={onFreeze}>{t.rescueUse(missed)}</button>
        ) : (
          <button className="today-go rescue-ice" disabled={crystals.crystals < cost} onClick={() => onBuyAndFreeze(cost)}>
            {t.rescueBuy(need, cost)}
          </button>
        )}
        {!isPro && <button className="btn wide" onClick={onPro}>{t.rescuePro}</button>}
        <button className="btn wide ghost-btn" onClick={onLetGo}>{t.rescueLetGo}</button>
      </div>
    </div>
  );
}
