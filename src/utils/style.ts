import React from "react";

// Common layout constants
export const COMMON_TOGGLE_TOP = "0px";
export const COMMON_CHART_PANEL_TOP = "10px";

export const RightPanelStyle: React.CSSProperties = {
  width: "auto",
  right: "20px",
  top: COMMON_CHART_PANEL_TOP,
  display: "block",
  background: "transparent",
  boxShadow: "none",
  border: "none",
  backdropFilter: "none",
  padding: 0,
  maxHeight: "none",
  overflow: "visible",
  zIndex: 101,
};

export const LeftPanelStyle: React.CSSProperties = {
  width: "430px",
  maxHeight: "82%",
  display: "flex",
  flexDirection: "column",
  gap: "15px",
  pointerEvents: "auto",
  zIndex: 100,
  overflowY: "auto",
  overflowX: "hidden",
  msOverflowStyle: "none",
};

export const BottomInputPanelStyle: React.CSSProperties = {
  width: "350px",
  left: "auto",
  right: "20px",
  transform: "none",
};

export const ResetBtnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
};


export const darkenColor = (color: string) => {
  if (color === "#68EE76") return "#2DB83B";
  if (color === "#F25F33") return "#C43F18";
  return color;
};

export const DEFAULT_COLORS = {
  male: "#68EE76", // Light Green
  female: "#F25F33", // Orange
};