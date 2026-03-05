import React, { useState, useMemo } from "react";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { getValidNumber } from "../utils/commonFunction";

// --- Types ---
export interface ButterflyData {
  name: string;
  maleVal: number;
  femaleVal: number;
  maleVal20?: number;
  femaleVal20?: number;
  maleLabel: string;
  femaleLabel: string;
  // Optional raw name if display name differs (e.g. for selection IDs)
  rawName?: string;
}

interface NestedButterflyChartProps {
  data: ButterflyData[];
  maxVal?: number; // If not provided, will be calculated from data
  selectedItems?: string[];
  onItemToggle?: (name: string) => void;
  showComparison?: boolean; // Defaults to true if data has 2020 values
  maleColor?: string;
  femaleColor?: string;
}

// --- Constants & Helpers ---
const DEFAULT_COLORS = {
  male: "#68EE76", // Light Green
  female: "#F25F33", // Orange
};

const darkenColor = (color: string) => {
  if (color === "#68EE76") return "#2DB83B";
  if (color === "#F25F33") return "#C43F18";
  return color;
};

// Helper to split "1.2k (12%)" into ["1.2k", "12%"]
const splitLabel = (label: string) => {
  if (!label) return ["0", "0%"];
  const parts = label.split(" (");
  if (parts.length === 2) {
    return [parts[0], parts[1].replace(")", "")];
  }
  return [label, ""];
};

// --- Component ---
export const NestedButterflyChart: React.FC<NestedButterflyChartProps> = ({
  data,
  maxVal,
  selectedItems = [],
  onItemToggle,
  showComparison = true,
  maleColor = DEFAULT_COLORS.male,
  femaleColor = DEFAULT_COLORS.female,
}) => {
  // Calculate max if not provided
  const calculatedMax = useMemo(() => {
    if (maxVal !== undefined) return maxVal;
    if (!data || data.length === 0) return 100;
    return Math.max(...data.map((d) => Math.max(d.maleVal, d.femaleVal)));
  }, [data, maxVal]);

  const Row = ({ row }: { row: ButterflyData }) => {

    const hasInvalidValue = (obj) => {
      return Object.values(obj).some((value) => {
        return (
          value === null ||
          value === undefined ||
          value === 0 ||
          (typeof value === "number" && Number.isNaN(value)) ||
          (typeof value === "string" && value.includes("NaN"))
        );
      });
    };

    const [isHovered, setIsHovered] = useState(false);

    // Determine Selection Key
    const selectionKey = row.rawName || row.name;
    const isSelected = selectedItems.includes(selectionKey);
    const isInteractive = !!onItemToggle;

    // Width Calculations
    const maleWidth = (row.maleVal / calculatedMax) * 100;
    const femaleWidth = (row.femaleVal / calculatedMax) * 100;

    // Comparison Widths (Nested)
    const maleCompWidth =
      showComparison && row.maleVal20 && row.maleVal > 0
        ? (row.maleVal20 / row.maleVal) * 100
        : 0;
    const femaleCompWidth =
      showComparison && row.femaleVal20 && row.femaleVal > 0
        ? (row.femaleVal20 / row.femaleVal) * 100
        : 0;

    const [maleValStr, malePercStr] = splitLabel(row.maleLabel);
    const [femaleValStr, femalePercStr] = splitLabel(row.femaleLabel);

    return (
      <div
        onClick={() =>
          !hasInvalidValue(row) && isInteractive && onItemToggle && onItemToggle(selectionKey)
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 85px 1fr",
          alignItems: "center",
          marginBottom: "8px",
          fontSize: "11px",
          cursor: isInteractive ? "pointer" : "default",
          padding: "6px 8px",
          borderRadius: "8px",
          transition: "all 0.2s ease",
          border: isSelected
            ? "1px solid #FF8C69"
            : !hasInvalidValue(row) && isHovered && isInteractive
              ? `1px solid ${DOHA_FLAG_COLOR}`
              : "1px solid transparent",

          backgroundColor: hasInvalidValue(row) ? "rgba(255, 140, 105, 0.15)" : isSelected
            ? "rgba(255, 140, 105, 0.15)"
            : isHovered && isInteractive
              ? DOHA_FLAG_COLOR_RGBA_06
              : "transparent",
          opacity: hasInvalidValue(row) ? 0.5 : 1,
        }}
      >
        {/* LEFT: MALE */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {/* Label Stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: "1.1",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontWeight: 600 }}>{getValidNumber(maleValStr)}</span>
            <span style={{ color: "#94a3b8", fontSize: "9px" }}>
              {malePercStr}
            </span>
          </div>

          {/* Bar Area */}
          <div
            style={{
              flex: 1, // EXPAND to fill space
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: `${maleWidth}%`,
                height: "10px",
                backgroundColor: maleColor,
                borderRadius: "4px 0 0 4px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                minWidth: "2px", // Ensure visibility
              }}
            >
              {showComparison && row.maleVal20 !== undefined && (
                <div
                  style={{
                    width: `${Math.min(maleCompWidth, 100)}%`,
                    height: "100%",
                    backgroundColor: darkenColor(maleColor),
                    borderRadius: "4px 0 0 4px",
                    marginRight: "0",
                    opacity: 0.8,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* CENTER: LABEL */}
        <div
          style={{
            color: isSelected ? "#FF8C69" : "#fff",
            justifySelf: "center",
            fontWeight: 600,
            maxWidth: "80px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
            lineHeight: "1.2",
            fontSize: "10px",
          }}
        >
          {row.name}
        </div>

        {/* RIGHT: FEMALE */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {/* Bar Area */}
          <div
            style={{
              flex: 1, // EXPAND to fill space
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                width: `${femaleWidth}%`,
                height: "10px",
                backgroundColor: femaleColor,
                borderRadius: "0 4px 4px 0",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                minWidth: "2px",
              }}
            >
              {showComparison && row.femaleVal20 !== undefined && (
                <div
                  style={{
                    width: `${Math.min(femaleCompWidth, 100)}%`,
                    height: "100%",
                    backgroundColor: darkenColor(femaleColor),
                    borderRadius: "0 4px 4px 0",
                    opacity: 0.8,
                  }}
                />
              )}
            </div>
          </div>

          {/* Label Stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              lineHeight: "1.1",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontWeight: 600 }}>
              {getValidNumber(femaleValStr)}
            </span>
            <span style={{ color: "#94a3b8", fontSize: "9px" }}>
              {femalePercStr}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", padding: "5px 0" }}>
      {data.map((row, i) => (
        <Row key={i} row={row} />
      ))}
    </div>
  );
};
