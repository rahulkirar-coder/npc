import React from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { BottomInputPanel } from "../components/AIChat";
import { RawiChatCard } from "../components/RawiChatCard";
import { Footer } from "../components/PopulationFooter";
import TogglePanel from "../components/TogglePanel";

// --- Styles ---
const SCREEN_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "absolute",
  top: 0,
  left: 0,
  overflow: "hidden",
  pointerEvents: "none",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding:"0px 25px 0px 20px"
};

const LEFT_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "50px 10px 30px 10px",
};

const MIDDLE_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  paddingBottom: "30px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
};

const RIGHT_PANEL_STYLE: React.CSSProperties = {
  width: "30%",
  height: "100%",
  padding: "0px 20px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

export const MainLayout = ({ leftSideRaviChatData, leftSideChatInputData, middleTopData, middleBottomData, children }: any) => {
  return (
    <div style={SCREEN_STYLE}>
      <LoadingOverlay />

      <div style={LEFT_PANEL_STYLE}>

        <RawiChatCard {...leftSideRaviChatData} />

        <BottomInputPanel {...leftSideChatInputData} />
      </div>

      <div style={MIDDLE_PANEL_STYLE}>
        <TogglePanel
          {...middleTopData}
        />

        <Footer {...middleBottomData} />
      </div>

      <div style={RIGHT_PANEL_STYLE}>
        {children}
      </div>
    </div>
  );
};
