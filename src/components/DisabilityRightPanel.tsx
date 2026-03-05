import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { BottomInputPanel } from "./BottomInputPanel";
import { RawiChatCard } from "./RawiChatCard";
import { COMMON_CHART_PANEL_TOP } from "../utils/style";

// --- Types ---
interface DisabilitySexItem {
  disability: string;
  gender: string;
  total: number;
}

interface SeverityItem {
  disabilitySeverity: string;
  gender: string;
  total: number;
}

interface DisabilityData {
  disabilityBySex: DisabilitySexItem[];
  severityLevels: SeverityItem[];
}

interface Props {
  data: DisabilityData | null;
  onStartTransition?: () => void;
}

// --- Styles ---
const CHART_TITLE_STYLE: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#FF8C69",
  marginBottom: "15px",
};

// --- Colors ---
const COLORS = {
  radarStroke: "rgba(252, 136, 89, 1)", // Violet (used for Female in logic below)
  radarFill: "rgba(255, 147, 100, 1)",
  barFill: "rgba(153, 255, 163, 1)", // Green (used for Male Bar)
  radarStrokeB: "rgba(143, 250, 154, 1)", // Green (used for Male in logic below)
  radarFillB: "rgba(143, 250, 154, 0.2)",
};

const COMMON_CHIPS = [
  "Prevalence by Municipality",
  "Accessibility analysis in Doha",
  "Disability support centers",
  "Compare 2020 vs 2025 statistics",
];

export const DisabilityRightPanel: React.FC<Props> = ({
  data,
  onStartTransition,
}) => {
  const navigate = useNavigate();
  const { map } = useMap();

  const handleTransition = (path: string) => {
    if (onStartTransition) onStartTransition();
    if (map) {
      map.stop();
      map.flyTo({
        center: [51.5348, 25.2867],
        zoom: 9,
        pitch: 0,
        bearing: 0,
        duration: 2000,
        essential: true,
      });
      map.once("moveend", () => navigate(path));
    } else {
      navigate(path);
    }
  };

  const processTextAndNavigate = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return;

    if (lowerText.includes("population")) handleTransition("/population");
    else if (lowerText.includes("establishment"))
      handleTransition("/establishment");
    else if (lowerText.includes("building")) handleTransition("/building");
    else if (lowerText.includes("household")) handleTransition("/household");
    else if (lowerText.includes("disability")) handleTransition("/disability");
    else handleTransition("/city");
  };

  // --- Data Transformation ---

  // 1. Radar Chart Data
  const radarData = useMemo(() => {
    if (!data?.disabilityBySex) return [];

    const grouped: Record<string, { subject: string; A: number; B: number }> =
      {};

    // We filter out "None" to focus on disabilities
    const relevantData = data.disabilityBySex.filter(
      (d) => d.disability !== "None"
    );

    relevantData.forEach((item) => {
      if (!grouped[item.disability]) {
        grouped[item.disability] = {
          subject: item.disability,
          A: 0, // Female
          B: 0, // Male
        };
      }

      if (item.gender === "Female") {
        grouped[item.disability].A += item.total;
      } else {
        grouped[item.disability].B += item.total;
      }
    });

    const maxVal = Math.max(
      ...Object.values(grouped).map((i) => Math.max(i.A, i.B))
    );
    const fullMark = maxVal * 1.1;

    return Object.values(grouped).map((item) => ({
      ...item,
      fullMark,
    }));
  }, [data]);

  // 2. Vertical Bar Chart Data (Severity)
  const barData = useMemo(() => {
    if (!data?.severityLevels) return [];

    // Initialize groupings with Male/Female counts
    const grouped: Record<string, { Male: number; Female: number }> = {};

    const relevantData = data.severityLevels.filter(
      (d) => d.disabilitySeverity !== "None"
    );

    relevantData.forEach((item) => {
      if (!grouped[item.disabilitySeverity]) {
        grouped[item.disabilitySeverity] = { Male: 0, Female: 0 };
      }
      if (item.gender === "Male") {
        grouped[item.disabilitySeverity].Male += item.total;
      } else {
        grouped[item.disabilitySeverity].Female += item.total;
      }
    });

    const order = [
      "Some Difficulty",
      "A Lot of Difficulty",
      "Cannot do at All",
    ];

    return order
      .map((key) => ({
        name: key,
        count: grouped[key]?.Male || 0, // 'count' maps to Male to match existing bar
        Female: grouped[key]?.Female || 0,
      }))
      .filter((i) => i.count > 0 || i.Female > 0);
  }, [data]);

  const LegendItem = ({ color, label }: any) => (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <span style={{ fontSize: "10px", color: "#cbd5e1" }}>{label}</span>
    </div>
  );

  const chatText = `Finally, a truly smart city is an inclusive city. We must identify those who need specific support to ensure no one is left behind`;

  if (!data) return null;

  return (
    <>
      <div className="top-left-panel">
        <RawiChatCard
          text={chatText}
          buttonText=""
          onButtonClick={() => handleTransition("/establishment")}
          // minHeight="80px"
        />
      </div>

      <div className="right-side-panel"  style={{ top: COMMON_CHART_PANEL_TOP }}>
        {/* CHART 1: Radar Chart (Spider Chart) */}
        <div className="glass-card">
          <div style={CHART_TITLE_STYLE}>
            Distribution by Disability Type & Gender
          </div>
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.3)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#ffffff", fontSize: 10 }}
                />
                <PolarRadiusAxis angle={30} tick={false} axisLine={false} />
                <Radar
                  name="Female"
                  dataKey="A"
                  stroke={COLORS.radarStroke}
                  fill={COLORS.radarFill}
                  fillOpacity={0.4}
                />
                <Radar
                  name="Male"
                  dataKey="B"
                  stroke={COLORS.radarStrokeB}
                  fill={COLORS.radarFillB}
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  // @ts-ignore
                  formatter={(val: number) => val.toLocaleString()}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <LegendItem color={COLORS.radarStrokeB} label="Male" />
            <LegendItem color={COLORS.radarStroke} label="Female" />
          </div>
        </div>

        {/* CHART 2: Vertical Bar Chart */}
        <div className="glass-card">
          <div style={CHART_TITLE_STYLE}>Distribution by Severity Levels</div>
          <div style={{ height: "160px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#fff", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#fff", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  // @ts-ignore
                  formatter={(val: number) => val.toLocaleString()}
                />
                <Bar
                  dataKey="count"
                  name="Male"
                  fill={COLORS.barFill}
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
                <Bar
                  dataKey="Female"
                  name="Female"
                  fill="#fb923c"
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <LegendItem color={COLORS.barFill} label="Male" />
            <LegendItem color="#fb923c" label="Female" />
          </div>
        </div>
      </div>

      <BottomInputPanel
        chips={COMMON_CHIPS}
        onSubmit={processTextAndNavigate}
      />
    </>
  );
};
