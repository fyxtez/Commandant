import "./TopBar.css";

interface Props {
  onSettings?: () => void;
  title?: string;
  showDot?: boolean;
}

export default function TopBar({ onSettings, title = "Commandant", showDot = false }: Props) {
  return (
    <div className="topbar">
      <div className="topbar__title">
        {showDot && <span className="topbar__dot" />}
        {title}
      </div>
      {onSettings && (
        <button
          className="topbar__settings-btn"
          onClick={onSettings}
          aria-label="Settings"
        >
          ⚙
        </button>
      )}
    </div>
  );
}
