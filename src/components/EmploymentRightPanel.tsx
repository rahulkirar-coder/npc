import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { BottomInputPanel } from "./BottomInputPanel";
import { RawiChatCard } from "./RawiChatCard";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";
import {
  COMMON_CHART_PANEL_TOP,
  DEFAULT_COLORS,
  ResetBtnStyle,
  darkenColor
} from "../utils/style";
import {
  NestedButterflyChart,
  type ButterflyData,
} from "./NestedButterflyChart";
import { CircleLegendIcon, DiamondLegendIcon } from "./atoms";

// --- Types ---
export interface EmploymentData {
  economyDistributionData: any[]; // Now formatted for ButterflyData
  skillLevelGraph: any[]; // { name, mq25, ..., mq20, ... }
  sectorData2025: any[]; // { name, value }
  sectorData2020: any[]; // { name, value }
}

interface Props {
  data: EmploymentData | null;
  onStartTransition?: () => void;
  // Filters
  selectedActivities?: string[];
  onActivityToggle?: (activity: string) => void;
  selectedSkills?: string[];
  onSkillToggle?: (skill: string) => void;
  onResetFilters?: () => void;
  // Added:
  chatData?: {
    text: string;
    recommendations: string[];
    question?: string;
  } | null;
  onRecommendationClick?: (rec: string) => void;
  onDataUpdate?: (data: any) => void;
}

// --- Styles ---
const CHART_TITLE_STYLE: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#FF8C69",
  marginBottom: "15px",
};

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
  marginBottom: "10px",
};

// --- Colors ---
const COLORS = {
  // 2025 (Bright/Light)
  mq25: "#15803d", // Dark Green
  mnq25: "#4ade80", // Light Green
  fq25: "#b91c1c", // Dark Red
  fnq25: "#fb923c", // Orange

  // New Qatari/Non-Qatari Colors for Butterfly
  qatari: "#20852A", // Green
  nonQatari: "#F25F33", // Orange

  // 2020 (Darker)
  mq20: "#052e16",
  mnq20: "#166534",
  fq20: "#7f1d1d",
  fnq20: "#9a3412",

  // Sector Colors
  sector: {
    Government: "#f97316",
    Mixed: "#7c3aed",
    Private: "#86efac",
  },
};

export const EmploymentRightPanel: React.FC<Props> = ({
  data,
  onStartTransition,
  selectedActivities = [],
  onActivityToggle,
  selectedSkills = [],
  onSkillToggle,
  onResetFilters,
  chatData,
  onRecommendationClick,
  onDataUpdate,
}) => {
  const navigate = useNavigate();
  const { map } = useMap();
  const isRightPanelOpen = useSelector(
    (state: AppState) => state.app.isRightPanelOpen,
  );

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
    if (lowerText.includes("establishment")) handleTransition("/establishment");
    else if (lowerText.includes("building")) handleTransition("/building");
    else if (lowerText.includes("population")) handleTransition("/population");
    else if (lowerText.includes("employment")) handleTransition("/employment");
    else handleTransition("/establishment");
  };

  const EMPLOYMENT_CHIPS = [
    "Analyze workforce distribution by Economic Activity",
    "Compare Private vs. Public employment",
    "Unemployment rates by Age Group and Nationality",
  ];

  // --- Helper: Format Numbers ---
  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "k";
    return n.toLocaleString();
  };

  const formatLabel = (val: number, total: number) => {
    return `${fmt(val)} (${total ? ((val / total) * 100).toFixed(0) : 0}%)`;
  };

  // --- Data Transformation for Butterfly Chart ---
  const { activityData, activityMax } = useMemo(() => {
    if (!data?.economyDistributionData)
      return { activityData: [], activityMax: 100 };

    // The data coming from prop is currently structured as:
    // { name, mq25, mnq25, fq25, fnq25, mq20, mnq20, ... }
    // We need to transform this to:
    // Left: Qatari (mq + fq)
    // Right: Non-Qatari (mnq + fnq)

    const rawData = data.economyDistributionData;

    // Calculate total for percentages
    const totalPop = rawData.reduce(
      (acc: number, item: any) =>
        acc +
        (item.mq25 || 0) +
        (item.mnq25 || 0) +
        (item.fq25 || 0) +
        (item.fnq25 || 0),
      0,
    );

    const chartData: ButterflyData[] = rawData.map((item: any) => {
      // Qatari (Left) = Male Qatari + Female Qatari
      const qatari25 = (item.mq25 || 0) + (item.fq25 || 0);
      const qatari20 = (item.mq20 || 0) + (item.fq20 || 0);

      // Non-Qatari (Right) = Male Non-Qatari + Female Non-Qatari
      const nonQatari25 = (item.mnq25 || 0) + (item.fnq25 || 0);
      const nonQatari20 = (item.mnq20 || 0) + (item.fnq20 || 0);

      return {
        name: item.name,
        maleVal: qatari25, // Mapping Qatari to "Left/Male" slot
        maleVal20: qatari20,
        femaleVal: nonQatari25, // Mapping Non-Qatari to "Right/Female" slot
        femaleVal20: nonQatari20,
        maleLabel: formatLabel(qatari25, totalPop),
        femaleLabel: formatLabel(nonQatari25, totalPop),
      };
    });

    const max =
      Math.max(...chartData.map((d) => Math.max(d.maleVal, d.femaleVal))) ||
      100;

    return { activityData: chartData, activityMax: max };
  }, [data]);

  const totalSector2025 = useMemo(() => {
    return (
      data?.sectorData2025?.reduce((acc, curr) => acc + curr.value, 0) || 0
    );
  }, [data]);

  const NestedBarShape = (props: any) => {
    const { fill, x, y, width, height, dataKey, payload } = props;

    let val20 = 0;
    let color20 = fill;

    if (dataKey === "mq25") {
      val20 = payload.mq20;
      color20 = COLORS.mq20;
    }
    if (dataKey === "mnq25") {
      val20 = payload.mnq20;
      color20 = COLORS.mnq20;
    }
    if (dataKey === "fq25") {
      val20 = payload.fq20;
      color20 = COLORS.fq20;
    }
    if (dataKey === "fnq25") {
      val20 = payload.fnq20;
      color20 = COLORS.fnq20;
    }

    const val25 = payload[dataKey];
    const height20 = val25 ? (val20 / val25) * height : 0;
    const y20 = y + (height - height20);

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={2}
          ry={2}
        />
        {val20 > 0 && (
          <rect
            x={x + width * 0.25}
            y={y20}
            width={width * 0.5}
            height={height20}
            fill={color20}
            rx={1}
            ry={1}
          />
        )}
      </g>
    );
  };

  const SkillTick = ({ x, y, payload }: any) => {
    const isSelected = selectedSkills.includes(payload.value);
    const [isHovered, setIsHovered] = useState(false);

    return (
      <g
        transform={`translate(${x},${y})`}
        onClick={() => onSkillToggle && onSkillToggle(payload.value)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: "pointer" }}
      >
        {(isSelected || isHovered) && (
          <rect
            x={-40}
            y={-10}
            width={80}
            height={20}
            rx={10}
            fill={
              isSelected ? "rgba(255, 140, 105, 0.2)" : DOHA_FLAG_COLOR_RGBA_06
            }
            stroke={isSelected ? "#FF8C69" : DOHA_FLAG_COLOR}
            strokeWidth={1}
          />
        )}
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="middle"
          fill={isSelected ? "#FF8C69" : "#fff"}
          fontSize={10}
          fontWeight={isSelected ? 700 : 600}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const CustomLegend = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        marginTop: "10px",
        fontSize: "8.5px",
        color: "#ccc",
        width: "100%",
      }}
    >
      {/* Simplified Legend for Nationality Split */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#fff", minWidth: "30px" }}>
          2025:
        </span>

        <CircleLegendIcon color={COLORS.qatari} label={"Qatari"} />
        <CircleLegendIcon color={COLORS.nonQatari} label={"Non-Qatari"} />

      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#fff", minWidth: "30px" }}>
          2020:
        </span>
        <DiamondLegendIcon color={darkenColor(DEFAULT_COLORS.male)} label={"Qatari"} />
        <DiamondLegendIcon color={darkenColor(DEFAULT_COLORS.female)} label={"Non-Qatari"} />
      </div>
    </div>
  );

  return (
    <>
      <div className="top-left-panel hide-scroll">
        <RawiChatCard
          text={
            chatData?.text ||
            `The 'Skills Intensity' map visualizes a distinct segregation through color—intense reds mark the low-skilled industrial zones to the south, contrasting with the green high-skilled administrative hubs in the center.`
          }
          buttonText="Show Business Ecosystem"
          onButtonClick={() => handleTransition("/establishment")}
          // minHeight="60px"
          question={
            chatData?.question ||
            "Analyze workforce distribution by Economic Activity"
          }
          recommendations={chatData?.recommendations}
          onRecommendationClick={onRecommendationClick}
        />
      </div>

      {/* 1. CHARTS - MOVED TO LEFT */}
      {isRightPanelOpen && (
        <div
          className="right-side-panel"
          style={{ top: COMMON_CHART_PANEL_TOP }}
        >
          {/* Reset Button */}
          <div style={ResetBtnStyle}>
            <button style={RESET_BTN_STYLE} onClick={onResetFilters}>
              <span>Reset Filters</span>
            </button>
          </div>

          {/* CHART 1: Activity Butterfly (Nested Bars) - UPDATED to use NestedButterflyChart */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution of Economic Activities by Nationality & Gender
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 20px",
                marginBottom: "10px",
                fontSize: "10px",
                fontWeight: 700,
                color: "#94a3b8",
              }}
            >
              <span>QATARI (Left)</span>
              <span>NON-QATARI (Right)</span>
            </div>

            <div
              style={{ width: "100%", maxHeight: "350px", overflowY: "auto" }}
              className="hide-scroll"
            >
              <NestedButterflyChart
                data={activityData}
                maxVal={activityMax}
                selectedItems={selectedActivities}
                onItemToggle={onActivityToggle}
                showComparison={true}
                maleColor={COLORS.qatari}
                femaleColor={COLORS.nonQatari}
              />
            </div>

            <CustomLegend />
          </div>

          {/* CHART 2: Skill Level (Grouped Nested Bars) */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution of Employees by Skill Level, Nationality & Gender
            </div>
            <div style={{ height: "220px", width: "100%" }}>
              <ResponsiveContainer>
                <BarChart
                  data={data?.skillLevelGraph}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={<SkillTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                      borderRadius: "8px",
                    }}
                  />

                  <Bar
                    dataKey="mq25"
                    name="Male(Qatari)"
                    fill={COLORS.mq25}
                    shape={<NestedBarShape />}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="mnq25"
                    name="Male(Non-Qatari)"
                    fill={COLORS.mnq25}
                    shape={<NestedBarShape />}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="fq25"
                    name="Female(Qatari)"
                    fill={COLORS.fq25}
                    shape={<NestedBarShape />}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="fnq25"
                    name="Female(Non-Qatari)"
                    fill={COLORS.fnq25}
                    shape={<NestedBarShape />}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Reuse old legend for skill chart or create specific one */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginTop: "10px",
                fontSize: "8.5px",
                color: "#ccc",
                width: "100%",
              }}
            >
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{ fontWeight: 700, color: "#fff", minWidth: "30px" }}
                >
                  2025:
                </span>

                <CircleLegendIcon color={COLORS.mq25} label="Male(Q)" />
                <CircleLegendIcon color={COLORS.mnq25} label="Male(NQ)" />
                <CircleLegendIcon color={COLORS.fq25} label="Female(Q)" />
                <CircleLegendIcon color={COLORS.fnq25} label="Female(NQ)" />
              </div>

              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{ fontWeight: 700, color: "#fff", minWidth: "30px" }}
                >
                  2020:
                </span>

                <DiamondLegendIcon color={COLORS.mq20} label="Male(Q)" />
                <DiamondLegendIcon color={COLORS.mnq20} label="Male(NQ)" />
                <DiamondLegendIcon color={COLORS.fq20} label="Female(Q)" />
                <DiamondLegendIcon color={COLORS.fnq20} label="Female(NQ)" />
              </div>
            </div>
          </div>

          {/* CHART 3: Sector Distribution (Concentric Donut) */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>Distribution by Sector</div>
            <div style={{ display: "flex", width: "100%" }}>
              <div
                style={{ height: "200px", width: "50%", position: "relative" }}
              >
                <ResponsiveContainer>
                  <PieChart>
                    {/* Inner Pie (2020) */}
                    <Pie
                      data={data?.sectorData2020}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {data?.sectorData2020.map((entry, index) => {
                        // @ts-ignore
                        const col = COLORS.sector[entry.name] || "#888";
                        return (
                          <Cell
                            key={`cell-20-${index}`}
                            fill={col}
                            fillOpacity={0.6}
                          />
                        );
                      })}
                    </Pie>

                    {/* Outer Pie (2025) */}
                    <Pie
                      data={data?.sectorData2025}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {data?.sectorData2025.map((entry, index) => {
                        // @ts-ignore
                        const col = COLORS.sector[entry.name] || "#888";
                        return <Cell key={`cell-25-${index}`} fill={col} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "none",
                        color: "#fff",
                        fontSize: "11px",
                        borderRadius: "8px",
                      }}
                      // @ts-ignore
                      formatter={(val) => val.toLocaleString()}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {totalSector2025.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  width: "50%",
                  paddingLeft: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: "5px",
                  }}
                >
                  2025
                </div>
                {data?.sectorData2025.map((item) => (
                  <div
                    key={`l25-${item.name}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      color: "#ccc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CircleLegendIcon color={COLORS.sector[item.name] || "#888"} label={item.name} />

                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#fff" }}>
                        {item.value.toLocaleString()}
                      </span>
                      <span>{item.percent}</span>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#fff",
                    marginTop: "10px",
                    marginBottom: "5px",
                  }}
                >
                  2020
                </div>
                {data?.sectorData2020.map((item) => (
                  <div
                    key={`l20-${item.name}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px", 
                      color: "#ccc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CircleLegendIcon color={COLORS.sector[item.name] || "#888"} label={item.name} opacity={0.6} />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontWeight: 700, color: "#fff" }}>
                        {item.value.toLocaleString()}
                      </span>
                      <span>{item.percent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM INPUT PANEL - MOVED TO RIGHT */}
      <BottomInputPanel
        chips={chatData?.recommendations || EMPLOYMENT_CHIPS}
        onSubmit={processTextAndNavigate}
        onDataUpdate={onDataUpdate}
      />
    </>
  );
};
