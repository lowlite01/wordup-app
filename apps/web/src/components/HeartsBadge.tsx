import { useApp } from "../context";
import Emoji from "./Emoji";

// "❤️ 4" in lesson headers (∞ with Pro).
export default function HeartsBadge() {
  const { hearts, isPro } = useApp();
  return (
    <span className={"hearts-badge" + (!isPro && hearts.count <= 1 ? " low" : "")}>
      <Emoji char="❤️" />
      <b key={hearts.count}>{isPro ? "∞" : hearts.count}</b>
    </span>
  );
}
