import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleRightPanel, type AppState } from "../state/appReducer";
import { BarChart2, ChevronDown, ChevronRight } from "lucide-react"; // Changed chevron direction conceptually

const BUTTON_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "80px",
  right: "20px", // CHANGED: Moved to Right
  left: "auto", // Reset left
  zIndex: 150,
  backgroundColor: "rgba(19, 27, 40, 0.85)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#FF8C69",
  backdropFilter: "blur(8px)",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  transition: "all 0.2s ease",
  pointerEvents: "auto",
};

export const ChartToggleBtn = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((state: AppState) => state.app.isRightPanelOpen);

  return (
    <>
      {isOpen ? (
        <>
          <button
            style={{
              ...BUTTON_STYLE,
              backgroundColor: isOpen ? "rgba(19, 27, 40, 0.85)" : "#FF8C69",
              color: isOpen ? "#FF8C69" : "#000",
              left: "auto", // Reset left
              right: "410px", // CHANGED: Moved to Right
              top: "85px",
            }}
            onClick={() => dispatch(toggleRightPanel())}
            title={isOpen ? "Hide Charts" : "Show Charts"}
          >
            {/* CHANGED: Use ChevronLeft to indicate closing towards the left edge */}
            <ChevronDown size={20} />
          </button>
        </>
      ) : (
        <button
          style={{
            ...BUTTON_STYLE,
            backgroundColor: isOpen ? "rgba(19, 27, 40, 0.85)" : "#FF8C69",
            color: isOpen ? "#FF8C69" : "#000",
          }}
          onClick={() => dispatch(toggleRightPanel())}
          title={isOpen ? "Hide Charts" : "Show Charts"}
        >
          {/* CHANGED: Use ChevronLeft to indicate closing towards the left edge */}
          <BarChart2 size={20} />
        </button>
      )}
    </>
  );
};
