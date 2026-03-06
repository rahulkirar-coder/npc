import { DownloadIcon } from "lucide-react";
import React, { useState, useEffect } from "react";

// --- Icons (Inline SVGs) ---
const ArrowRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

// --- Styles ---
const COLORS = {
  bg: "#15161A",
  gold: "#D4AF37",
  textMain: "#EAEAEA",
  textMuted: "#9CA3AF",
  border: "#3F3F46",
  buttonBg: "#232326",
};

const CARD_STYLE: React.CSSProperties = {
  width: "100%",
  maxHeight: "50%",
  borderRadius: "12px",
  padding: "24px",
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  position: "relative",
  pointerEvents: "auto",
  background: "rgba(30, 41, 59, 0.8)",
};

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const BRAND_WRAPPER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const PEARL_STYLE: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 30% 30%, #ffffff, #FDE68A, #927533)",
  boxShadow: "0 0 10px rgba(253, 230, 138, 0.4)",
};

const RAWI_TEXT_STYLE: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "700",
  color: COLORS.gold,
  letterSpacing: "0.5px",
};

const TITLE_SECTION_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const GOLD_PIPE_STYLE: React.CSSProperties = {
  width: "3px",
  height: "18px",
  backgroundColor: COLORS.gold,
  borderRadius: "2px",
};

const ITALIC_TITLE_STYLE: React.CSSProperties = {
  fontStyle: "italic",
  color: "#d4d4d8",
  fontSize: "14px",
};

const BODY_TEXT_STYLE: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: COLORS.textMain,
  whiteSpace: "pre-wrap",
  maxHeight: "200px",
  overflow: "scroll",
  // border:"1px solid red"
};

const RECOMMENDATIONS_CONTAINER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "8px",
  maxHeight: "150px",
  overflow: "scroll",
};

const RECOMMENDATION_BTN_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#d4d4d8",
  fontSize: "12px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
  width: "100%",
};

// --- Helper: TypewriterText ---
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    if (!text) return;

    let i = 0;
    const intervalId = setInterval(() => {
      i++;
      setDisplayedText(text.substring(0, i));
      if (i >= text.length) clearInterval(intervalId);
    }, 30); // Speed

    return () => clearInterval(intervalId);
  }, [text]);

  return <span>{displayedText}</span>;
};

// --- Main Component ---
interface RawiChatCardProps {
  text: string;
  buttonText?: string;
  onButtonClick?: () => void;
  question?: string;
  recommendations?: string[];
  onRecommendationClick?: (rec: string) => void;
  history: any
}

export const RawiChatCard: React.FC<RawiChatCardProps> = ({
  question,
  text,
  buttonText,
  onButtonClick,
  recommendations,
  onRecommendationClick,
  history
}) => {

  return (
    <div style={CARD_STYLE}>
      {/* Header */}
      <div style={HEADER_STYLE}>
        <div style={BRAND_WRAPPER}>
          <div style={PEARL_STYLE} />
          <span style={RAWI_TEXT_STYLE}>Rawi</span>
        </div>
      </div>

      {/* Context Title with Gold Pipe */}
      {question && (
        <div style={TITLE_SECTION_STYLE}>
          <div style={GOLD_PIPE_STYLE} />
          <span style={ITALIC_TITLE_STYLE}>"{question}"</span>
        </div>
      )}

      {/* Main Body Text */}
      <div style={BODY_TEXT_STYLE} className="custom-scroll">
        <TypewriterText text={text} />
      </div>

      {/* Download button */}
      {/* <DownloadIcon /> */}

      {history && history.length > 0 &&
        (<div style={RECOMMENDATIONS_CONTAINER} className="custom-scroll">
          <div
            style={{ fontSize: "11px", color: "#d4d4d8", marginBottom: "2px" }}
          >
            Chat History:
          </div>

          <div>
            {history.map((item: any, index: number) => (
              <p key={index} style={{ fontSize: "11px", marginBottom: "5px" }}>{item.question}</p>
            ))}
          </div>
        </div>)}




      {/* Recommendations */}
      {/* {recommendations && recommendations.length > 0 && (
        <div style={RECOMMENDATIONS_CONTAINER}>
          <div
            style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}
          >
            Suggested Questions:
          </div>
          {recommendations.map((rec, idx) => (
            <button
              key={idx}
              style={RECOMMENDATION_BTN_STYLE}
              onClick={() =>
                onRecommendationClick && onRecommendationClick(rec)
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = COLORS.gold;
                e.currentTarget.style.color = COLORS.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "#d4d4d8";
              }}
            >
              <span>{rec}</span>
              <ArrowRightIcon />
            </button>
          ))}
        </div>
      )} */}

      {/* Old Footer Action (Optional, can keep alongside recommendations if needed) */}
      {/* {buttonText && !recommendations && (
        <button
          style={RECOMMENDATION_BTN_STYLE} // Reusing style for consistency
          onClick={onButtonClick}
        >
          <span>{buttonText}</span>
          <ArrowRightIcon />
        </button>
      )} */}
    </div>
  );
};
