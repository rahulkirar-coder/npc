import React, { useEffect, useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { BottomInputPanel } from "../components/AIChat";
import { RawiChatCard } from "../components/RawiChatCard";
import { Footer } from "../components/PopulationFooter";
import TogglePanel from "../components/TogglePanel";
import { FilterTags } from "../components/atoms";
import { ChartToggleBtn } from "../components/PopulationToggleBtn";
import type { AppState } from "../state/appReducer";
import { useSelector } from "react-redux";

// --- Styles ---
const SCREEN_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  pointerEvents: "none",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: "50px",
};

const LEFT_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "50px 0px",
  pointerEvents: "auto",
};

const MIDDLE_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: "10px",
  paddingBottom: "50px",
};

const RIGHT_PANEL_STYLE: React.CSSProperties = {
  width: "30%",
  height: "100%",
  display: "flex",
  gap: "10px",
  padding: "50px 0px",
};

// --- Styles ---
const RESET_BTN_STYLE: React.CSSProperties = {
  height: "100%",
  pointerEvents: "auto",
  backgroundColor: "#A30134",
  borderRadius: "50px",
  padding: "8px 18px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  alignItems: "center",
  transition: "all 0.2s ease",
  fontFamily: "Poppins",
  border: "none",
}

export const MainLayout = ({ leftSideRaviChatData, leftSideChatInputData, middleTopData, middleBottomData, filterTagsSet, onReset, children }: any) => {

  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const isTablet = width >= 768 && width <= 1024;
  const isLaptop = width > 1024 && width <= 1536;

  const containerPadding = isTablet
    ? "25px"
    : isLaptop
      ? "45px"
      : "90px";


  const isOpen = useSelector((state: AppState) => state.app.isRightPanelOpen);

  return (
    <div style={{ ...SCREEN_STYLE, paddingLeft: containerPadding, paddingRight: containerPadding }}>
      <LoadingOverlay />

      <div style={LEFT_PANEL_STYLE}>
        <div style={{
          width: "100%",
          height: "100%",
          background: "rgba(30, 41, 59, 0.8)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "25px",
          padding: "10px 10px"
        }}>
          <RawiChatCard {...leftSideRaviChatData} />

          <BottomInputPanel {...leftSideChatInputData} />
        </div>
      </div>

      <div style={MIDDLE_PANEL_STYLE}>
        <TogglePanel
          {...middleTopData}
        />

        <Footer {...middleBottomData} />
      </div>

      <div style={{ ...RIGHT_PANEL_STYLE, justifyContent: isOpen ? "space-between" : "flex-end" }}>
        <div style={{ paddingTop: "50px", width: "8%" }}><ChartToggleBtn /></div>

        <div style={{
          width: "90%",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "5px",
            height: "5%",
          }}>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {filterTagsSet?.map((item: any, index: any) => {
                return (
                  <FilterTags
                    key={index}
                    items={item?.item}
                    onToggle={item?.toggle}
                  />
                )
              })}

            </div>

            <button style={RESET_BTN_STYLE} onClick={onReset}>
              <span>Reset Filters</span>
            </button>
          </div>
          <div style={{ height: "92%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
