import React from "react";

const TITLE_STYLE: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  marginBottom: "12px",
  color: "#FF8C69",
};

// Updated Gradient
const LEGEND_BAR_STYLE: React.CSSProperties = {
  height: "8px",
  borderRadius: "4px",
  background:
    "linear-gradient(to right, #1a6b62, #22937f, #2cb9a0, #5dd4b8, #d4a437, #e8a945, #f97316, #8b1538)",
  marginBottom: "8px",
};

const LABELS_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  color: "#ccc",
  fontWeight: 500,
};

interface FooterProps {
  title: string;
  minVal?: string | number;
  maxVal?: string | number;
}

export const Footer = ({ title, minVal, maxVal }: FooterProps) => {
  return (
    <div
      className="footer-container glass-effect"
      style={{ padding: "16px 24px" }}
    >
      <div style={TITLE_STYLE}>{title}</div>
      <div style={LEGEND_BAR_STYLE} />
      <div style={LABELS_STYLE}>
        <span>Low</span>
        <span>High</span>
      </div>
      {(minVal !== undefined || maxVal !== undefined) && (
        <div style={LABELS_STYLE}>
          <span>
            {typeof minVal === "number" ? minVal.toLocaleString() : minVal}
          </span>
          <span>
            {typeof maxVal === "number" ? maxVal.toLocaleString() : maxVal}
          </span>
        </div>
      )}
    </div>
  );
};
