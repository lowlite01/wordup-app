import { useApp } from "../context";
import { useT } from "../i18n";
import { REFILL_COST, minutesToNext } from "../lib/hearts";
import Emoji from "./Emoji";

interface Props {
  onRefilled: () => void; // hearts are back — carry on
  onPro: () => void;
  onPractice: () => void; // free alternative: the Review tab
  onClose: () => void;
}

// Shown when the last heart is lost in a lesson (or a lesson is opened with 0).
export default function HeartsModal({ onRefilled, onPro, onPractice, onClose }: Props) {
  const { hearts, crystals, refillHearts } = useApp();
  const t = useT();
  const canRefill = crystals.crystals >= REFILL_COST;

  return (
    <div className="modal-backdrop hearts-backdrop" onClick={onClose}>
      <div className="hearts-modal" onClick={e => e.stopPropagation()}>
        <button className="hearts-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="hearts-row">
          {Array.from({ length: 5 }, (_, i) => (
            <Emoji key={i} char="❤️" className={"hearts-row-icon" + (i < hearts.count ? "" : " empty")} />
          ))}
        </div>
        <h2>{t.heartsOutTitle}</h2>
        <p className="muted">{t.heartsOutSub(minutesToNext(hearts))}</p>
        <button className="today-go pro-pay" onClick={onPro}>{t.heartsPro}</button>
        <button
          className="btn wide hearts-refill"
          disabled={!canRefill}
          onClick={() => { if (refillHearts()) onRefilled(); }}
        >
          {t.heartsRefill(REFILL_COST)}
        </button>
        <button className="btn wide ghost-btn" onClick={onPractice}>{t.heartsPractice}</button>
      </div>
    </div>
  );
}
