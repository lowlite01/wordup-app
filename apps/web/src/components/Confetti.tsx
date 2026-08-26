import type { CSSProperties } from "react";

const COLORS = ["#34D399", "#FB923C", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA"];

// A one-shot confetti burst rendered inside a positioned parent. Pure CSS —
// no libraries. Decorative only, so hidden from screen readers.
export default function Confetti({ count = 44 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const style: CSSProperties = {
          left: `${Math.random() * 100}%`,
          background: COLORS[i % COLORS.length],
          transform: `rotate(${Math.floor(Math.random() * 360)}deg)`,
          animationDelay: `${(Math.random() * 0.5).toFixed(2)}s`,
          animationDuration: `${(1.6 + Math.random() * 1.3).toFixed(2)}s`,
        };
        return <span key={i} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}
