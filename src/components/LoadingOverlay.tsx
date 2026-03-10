import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setLoading, setLoadingMessage, setLoadingDuration, type AppState } from "../state/appReducer";
import { DOHA_FLAG_COLOR } from "../util";

// --- Styles ---
const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  // Reduced opacity and blur so user can see the map updates happening behind
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  backdropFilter: "blur(3px)",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  pointerEvents: "all",
};

const CONTENT_CONTAINER_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "8px",
  marginBottom: "40px",
  width: "320px",
};

const PROGRESS_TEXT_STYLE: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: "700",
  color: DOHA_FLAG_COLOR, // Brand Orange
  fontFamily: "Inter, sans-serif",
  textShadow: "0 4px 10px rgba(0,0,0,0.3)",
};

const BAR_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: "3px",
  overflow: "hidden",
  marginBottom: "16px",
};

const BAR_FILL_STYLE = (progress: number): React.CSSProperties => ({
  height: "100%",
  width: `${progress}%`,
  backgroundColor: DOHA_FLAG_COLOR,
  borderRadius: "3px",
  // Smooth transition for the fill
  transition: "width 0.2s ease-out",
  boxShadow: "0 0 10px rgba(255, 140, 105, 0.6)",
});

const STATUS_PILL_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  backgroundColor: "rgba(20, 20, 23, 0.85)",
  border: `1px solid ${DOHA_FLAG_COLOR}`,
  borderRadius: "30px",
  padding: "12px 24px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
  width: "100%",
  justifyContent: "center",
  boxSizing: "border-box",
};

const PEARL_ICON_STYLE: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 35%, #ffffff, #e0e0e0, #a0a0a0)",
  boxShadow: "0 0 8px rgba(255, 255, 255, 0.4)",
  flexShrink: 0,
};

const TEXT_STYLE: React.CSSProperties = {
  color: "#fff",
  fontFamily: "Inter, sans-serif",
  fontSize: "14px",
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const HIGHLIGHT_TEXT_STYLE: React.CSSProperties = {
  color: "#FF8C69",
  fontWeight: 600,
};



export const LoadingOverlay = () => {
  const { isLoading, loadingDuration, loadingMessage } = useSelector(
    (state: AppState) => state.app
  );

  const dispatch = useDispatch();

  const localLoading = () => {
    let interval: any;

    if (isLoading) {
      setProgress(0);

      const updateFrequency = 50; // ms

      let increment = 5;

      if (loadingDuration && loadingDuration > 0) {
        const totalUpdates = loadingDuration / updateFrequency;
        increment = 90 / totalUpdates;
      }

      interval = setInterval(() => {
        setProgress((prev) => {
          // 1. PHASE: Move up to 90% based on calculated speed
          if (prev < 90) {
            return Math.min(prev + increment, 90);
          }

          // 2. STALL PHASE: Once at 90%, creep very slowly
          if (prev < 99) {
            return prev + 0.1;
          }

          return 99;
        });
      }, updateFrequency);
    } else {
      // API Finished: Snap to 100% immediately
      setProgress(100);
    }

    return () => clearInterval(interval);
  }

  useEffect(() => {
    if (!isLoading) return;

    const url = "https://rawi-backend.vercel.app/notifications/sse-steps";
    const eventSource = new EventSource(url);
    console.log(`Connecting to ${url}...`);

    dispatch(setLoadingDuration(0));

    eventSource.onopen = () => {
      console.log("✅ SSE Connection established");
      dispatch(setLoadingDuration(5))
      dispatch(setLoadingMessage("Analyzing Data..."));
    };

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      dispatch(setLoadingDuration(10))


      if (update.apiName === "query") {
        dispatch(setLoadingMessage("Analyzing Data..."));
        dispatch(setLoadingDuration(update.percentage));
        dispatch(setLoadingMessage(update?.data?.step));
      }

      if (update.status === "complete") {
        console.log("✅ SSE Connection completed");
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }, [isLoading]);

  // Don't render if not loading
  if (!isLoading) return null;

  console.log(loadingDuration)

  return (
    <div style={OVERLAY_STYLE}>
      <div style={CONTENT_CONTAINER_STYLE}>
        {/* Percentage Text */}
        <div style={PROGRESS_TEXT_STYLE}>{Math.floor(loadingDuration)}%</div>

        {/* Horizontal Bar */}
        <div style={BAR_CONTAINER_STYLE}>
          <div style={BAR_FILL_STYLE(loadingDuration)} />
        </div>

        {/* Status Message */}
        <div style={STATUS_PILL_STYLE}>
          <div style={PEARL_ICON_STYLE} />
          <span style={TEXT_STYLE}>
            {/* Analyzing:{" "} */}
            <span style={HIGHLIGHT_TEXT_STYLE}>{loadingMessage}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
