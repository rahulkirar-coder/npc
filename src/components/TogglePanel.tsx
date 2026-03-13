import React from "react";
import { DOHA_FLAG_COLOR } from "../util";

type ViewMode = "zone" | "block";
type Year = 2020 | 2025;

interface TogglePanelProps {
  activeYear: Year;
  viewMode: ViewMode;
  isTransitioning: React.MutableRefObject<boolean>;
  onChangeYear: (year: Year) => void;
  onChangeViewMode: (mode: ViewMode) => void;
}

const TOGGLE_STYLE: React.CSSProperties = {
  width: "100%",
  pointerEvents: "auto",
  display: "flex",
};

const TOGGLE_WRAPPER_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(19, 27, 40, 0.9)",
  borderRadius: "30px",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  gap: "2px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
};

const TOGGLE_BUTTON_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "8px 24px",
  borderRadius: "24px",
  border: "none",
  background: active ? DOHA_FLAG_COLOR : "transparent",
  color: active ? "#fff" : "#94a3b8",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  outline: "none",
});

const TogglePanel: React.FC<TogglePanelProps> = ({
  activeYear,
  viewMode,
  isTransitioning,
  onChangeYear,
  onChangeViewMode,
}) => {
  const handleYearChange = (year: Year) => {
    if (activeYear !== year && !isTransitioning.current) {
      onChangeYear(year);
    }
  };

  const handleViewChange = (mode: ViewMode) => {
    if (viewMode !== mode && !isTransitioning.current) {
      onChangeViewMode(mode);
    }
  };

  return (
    <div style={TOGGLE_STYLE}>
      {/* Year Toggle */}
      <div style={TOGGLE_WRAPPER_STYLE}>
        <button
          style={TOGGLE_BUTTON_STYLE(activeYear === 2020)}
          onClick={() => handleYearChange(2020)}
        >
          2020
        </button>
        <button
          style={TOGGLE_BUTTON_STYLE(activeYear === 2025)}
          onClick={() => handleYearChange(2025)}
        >
          2025
        </button>
      </div>

      <div style={{ width: "10px" }} />

      {/* View Mode Toggle */}
      <div style={TOGGLE_WRAPPER_STYLE}>
        <button
          style={TOGGLE_BUTTON_STYLE(viewMode === "zone")}
          onClick={() => handleViewChange("zone")}
        >
          Zone
        </button>
        <button
          style={TOGGLE_BUTTON_STYLE(viewMode === "block")}
          onClick={() => handleViewChange("block")}
        >
          Block
        </button>
      </div>
    </div>
  );
};

export default TogglePanel;
