import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setLoadingMessage,
  setLoadingDuration,
  setIsLocalLoading,
  setLoading,
  type AppState,
} from "../state/appReducer";
import { DOHA_FLAG_COLOR } from "../util";

// --- Styles ---
const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
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
  color: DOHA_FLAG_COLOR,
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
  const { isLoading, loadingDuration, loadingMessage, isLocalLoading } =
    useSelector((state: AppState) => state.app);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!isLoading) return;

    let interval: any;
    let eventSource: EventSource | null = null;

    // Reset only for local simulated loader
    if (!isLocalLoading) {
      dispatch(setLoadingDuration(0));
      dispatch(setLoadingMessage("Starting..."));
    }

    // -------------------------
    // SSE Loader (Query API)
    // -------------------------
    if (isLocalLoading) {
      const url = `${import.meta.env.VITE_API_BASE_URL}/notifications/sse-steps`;
      eventSource = new EventSource(url);

      console.log("SSE Connected");

      eventSource.onopen = () => {
        dispatch(setLoadingDuration(5));
        dispatch(setLoadingMessage("Analyzing Data..."));
      };

      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);

        if (update.apiName === "query") {
          dispatch(setLoadingDuration(update.percentage));
          dispatch(setLoadingMessage(update?.data?.step));
        }

        if (update.status === "complete") {
          console.log("SSE Complete");

          eventSource?.close();

          dispatch(setLoadingDuration(100));
          dispatch(setIsLocalLoading(false));
          dispatch(setLoading(false));
        }
      };

      eventSource.onerror = () => {
        console.log("SSE Error");
        eventSource?.close();
        dispatch(setLoading(false));
      };
    }

    // -------------------------
    // Local Simulated Loader
    // -------------------------
    if (!isLocalLoading) {
      const updateFrequency = 50;
      let progress = 0;

      interval = setInterval(() => {
        progress += 1;

        if (progress < 90) {
          dispatch(setLoadingDuration(progress));
        } else if (progress < 99) {
          progress += 0.1;
          dispatch(setLoadingDuration(progress));
        } else {
          dispatch(setLoadingDuration(100));

          clearInterval(interval);

          dispatch(setIsLocalLoading(false));
          dispatch(setLoading(false));
        }
      }, updateFrequency);
    }

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [isLoading, isLocalLoading, dispatch]);

  // Don't render if not loading
  if (!isLoading) return null;

  return (
    <div style={OVERLAY_STYLE}>
      <div style={CONTENT_CONTAINER_STYLE}>
        <div style={PROGRESS_TEXT_STYLE}>
          {Math.floor(loadingDuration)}%
        </div>

        <div style={BAR_CONTAINER_STYLE}>
          <div style={BAR_FILL_STYLE(loadingDuration)} />
        </div>

        <div style={STATUS_PILL_STYLE}>
          <div style={PEARL_ICON_STYLE} />
          <span style={TEXT_STYLE}>
            <span style={HIGHLIGHT_TEXT_STYLE}>{loadingMessage}</span>
          </span>
        </div>
      </div>
    </div>
  );
};