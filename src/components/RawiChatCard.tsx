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
  maxHeight: "80%",
  backgroundColor: COLORS.bg,
  borderRadius: "12px",
  padding: "24px",
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  border: `1px solid ${COLORS.border}`,
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  position: "relative",
  pointerEvents: "auto",

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
  color: "#9D957B",
  fontSize: "14px",
};

const BODY_TEXT_STYLE: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: COLORS.textMain,
  whiteSpace: "pre-wrap",
  maxHeight: "100px",
  overflow: "scroll",
};

const RECOMMENDATIONS_CONTAINER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "8px",
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
}

export const RawiChatCard: React.FC<RawiChatCardProps> = ({
  question,
  text,
  buttonText,
  onButtonClick,
  recommendations,
  onRecommendationClick,
}) => {



  const [history, setHistory] = useState<any>([]);

  const fetchQueryHistory = async () => {
    try {

      let sessionId = localStorage.getItem("sessionID");

      const response = await fetch("https://rawi-backend.vercel.app/query/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ? sessionId : null,
          limit: 10,
          page: 1
        }),
      });

      if (response.ok) {
        const json = await response.json();
        setHistory(json.history);
      }

    } catch (error) {

    } finally {

    }
  };

  useEffect(() => {
    fetchQueryHistory();
  }, [])

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

      {history && history.length > 0 && (<div style={RECOMMENDATIONS_CONTAINER}>
        <div
          style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}
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
