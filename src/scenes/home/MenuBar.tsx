import missionUrl from "../../assets/home/MissionButton.png";
import gemUrl from "../../assets/home/GemBookButton.png";
import inventoryUrl from "../../assets/home/InventoryButton.png";
import historyUrl from "../../assets/home/HistoryButton.png";

export type MenuKey = "mission" | "gem" | "inventory" | "history";

const ITEMS: { key: MenuKey; url: string; label: string }[] = [
  { key: "mission", url: missionUrl, label: "미션" },
  { key: "gem", url: gemUrl, label: "원석 도감" },
  { key: "inventory", url: inventoryUrl, label: "가디언즈 가방" },
  { key: "history", url: historyUrl, label: "탐험 일지" },
];

interface MenuBarProps {
  onOpen: (key: MenuKey) => void;
}

export default function MenuBar({ onOpen }: MenuBarProps) {
  return (
    <div className="home-menu">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          className="home-menu__btn"
          onClick={() => onOpen(it.key)}
          aria-label={it.label}
        >
          <img src={it.url} alt="" />
        </button>
      ))}
    </div>
  );
}
