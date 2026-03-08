import React, { useEffect, useState } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { BottomInputPanel } from "../components/AIChat";
import { RawiChatCard } from "../components/RawiChatCard";
import { Footer } from "../components/PopulationFooter";
import TogglePanel from "../components/TogglePanel";
import { FilterTags } from "../components/atoms";

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
  padding: "0px 25px 20px 20px"
};

const LEFT_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "50px 10px 0px 10px",
};

const MIDDLE_PANEL_STYLE: React.CSSProperties = {
  width: "25%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "10px",
};

const RIGHT_PANEL_STYLE: React.CSSProperties = {
  width: "30%",
  height: "100%",
  paddingRight: "25px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

// --- Styles ---
const RESET_BTN_STYLE: React.CSSProperties = {
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

  // const [history, setHistory] = useState<any>([]);

  // const fetchQueryHistory = async () => {
  //   try {

  //     let sessionId = localStorage.getItem("sessionID");

  //     const response = await fetch("https://rawi-backend.vercel.app/query/history", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         sessionId: sessionId ? sessionId : null,
  //         limit: 10,
  //         page: 1
  //       }),
  //     });

  //     if (response.ok) {
  //       const json = await response.json();
  //       setHistory(json.history);
  //     }

  //   } catch (error) {

  //   } finally {

  //   }
  // };

  // useEffect(() => {
  //   fetchQueryHistory();
  // }, [leftSideRaviChatData?.text])

  return (
    <div style={SCREEN_STYLE}>
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
          padding:"10px 10px"
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

      <div style={RIGHT_PANEL_STYLE}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingLeft: "30px"
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
        {children}
      </div>
    </div>
  );
};
