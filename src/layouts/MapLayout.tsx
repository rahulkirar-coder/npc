import React from "react";
import { Outlet } from "react-router-dom";
import { GraphArea } from "../components/GraphArea";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { Header } from "../components/Header";
import { ChartToggleBtn } from "../components/ChartToggleBtn";

export const MapLayout = () => {
  let isShow = window.location.pathname !== "/city";
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#0e131f",
      }}
    >
      {/* Header */}
      <Header />

      {/* 4. Chart Toggle Button */}
      {isShow && <ChartToggleBtn />}

      {/* 1. Persistent Map Background */}
      <GraphArea />

      {/* 2. Global Loading Overlay */}
      <LoadingOverlay />

      {/* 3. Route Content (Overlays) */}
      <div
        style={{
          position: "absolute",
          top: "80px", // Start below header
          left: 0,
          width: "100%",
          height: "calc(100% - 80px)", // Account for header height
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};
