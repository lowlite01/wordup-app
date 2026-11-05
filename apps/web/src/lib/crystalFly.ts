import { emojiUrl } from "../components/Emoji";

// "Crystals fly into the header" animation. Spawns a few 3D gem images at
// `from` (usually where the user last tapped) and sends each along a curved
// path into the header counter. `onHit` fires as each gem lands so the
// counter can tick up; `onDone` fires after the last one.

let lastTap: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
  // remember where the user last pressed — rewards fly out from there
  window.addEventListener("pointerdown", e => { lastTap = { x: e.clientX, y: e.clientY }; }, true);
}

export function flyCrystals(amount: number, target: HTMLElement, onHit: () => void, onDone: () => void) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const url = emojiUrl("💎");
  if (reduce || !url) { onDone(); return; }

  const to = target.getBoundingClientRect();
  const end = { x: to.left + 16, y: to.top + to.height / 2 };
  const start = lastTap ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };
  const count = Math.max(3, Math.min(10, amount));
  let landed = 0;
  let finished = false;
  const gems: HTMLElement[] = [];
  const finish = () => {
    if (finished) return;
    finished = true;
    gems.forEach(g => g.remove());
    onDone();
  };
  // Safety net: if the animations never finish (app sent to the background,
  // tab hidden…), still land on the right number.
  setTimeout(finish, 1200 + count * 70);

  for (let i = 0; i < count; i++) {
    const gem = document.createElement("img");
    gem.src = url;
    gem.alt = "";
    gem.className = "fly-gem";
    document.body.appendChild(gem);
    gems.push(gem);

    // each gem starts slightly scattered and arcs up via a random control point
    const sx = start.x + (Math.random() - 0.5) * 70;
    const sy = start.y + (Math.random() - 0.5) * 50;
    const cx = (sx + end.x) / 2 + (Math.random() - 0.5) * 160;
    const cy = Math.min(sy, end.y) - 80 - Math.random() * 80;
    const frames: Keyframe[] = [];
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * end.x;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * end.y;
      const scale = s === 0 ? 0.2 : t < 0.2 ? 1.25 : 1.1 - t * 0.5;
      frames.push({ transform: `translate(${x - 16}px, ${y - 16}px) scale(${scale})`, opacity: s === 0 ? 0 : 1 });
    }
    const anim = gem.animate(frames, {
      duration: 750 + Math.random() * 150,
      delay: i * 70,
      easing: "cubic-bezier(.45, 0, .55, 1)",
      fill: "both",
    });
    anim.onfinish = () => {
      if (finished) return;
      gem.remove();
      onHit();
      if (++landed === count) finish();
    };
  }
}
