import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";

// ... [Types, COLORS, IconRow kept same] ...
export interface NationalityItem {
  nationality: string;
  total: number;
}

export interface HeadStatsItem {
  nationality: string;
  gender: string;
  count: number;
}

export interface HouseholdStatsItem {
  name: string;
  households: number;
  size: number;
}

export interface HouseholdDashboardData {
  nationalityDistribution: NationalityItem[];
  headOfHouseholdStats: HeadStatsItem[];
  householdStats: HouseholdStatsItem[];
}

interface Props {
  data: HouseholdDashboardData | null;
  onStartTransition?: () => void;
  // Filters
  selectedNationalities?: string[];
  onNationalityToggle?: (val: string) => void;
  selectedGenders?: string[];
  onGenderToggle?: (val: string) => void;
  selectedMunicipalities?: string[];
  onMunicipalityToggle?: (val: string) => void;
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

const CHART_TITLE_STYLE: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#FF8C69",
  marginBottom: "10px",
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

const COLORS = {
  qatariGreen: "#4ade80",
  nonQatariOrange: "#fb923c",
};

const IconRow = ({
  count,
  type,
}: {
  count: number;
  type: "male" | "female";
}) => {
  const icons = [];
  const greenFilter =
    "brightness(0) saturate(100%) invert(76%) sepia(26%) saturate(1146%) hue-rotate(86deg) brightness(98%) contrast(90%)";
  const orangeFilter =
    "brightness(0) saturate(100%) invert(63%) sepia(61%) saturate(2374%) hue-rotate(336deg) brightness(101%) contrast(96%)";
  const filter = type === "male" ? greenFilter : orangeFilter;

  for (let i = 0; i < count; i++) {
    icons.push(
      // @ts-ignore
      <img
        key={i}
        src="/iconUser.svg"
        alt="user"
        style={{ width: "24px", height: "24px", filter: filter }}
      />,
    );
  }
  return <>{icons}</>;
};

export const HouseholdRightPanel: React.FC<Props> = ({
  data,
  onStartTransition,
  selectedNationalities = [],
  onNationalityToggle,
  selectedGenders = [],
  onGenderToggle,
  selectedMunicipalities = [],
  onMunicipalityToggle,
  chatData,
  onRecommendationClick,
  onDataUpdate,
}) => {
  const navigate = useNavigate();
  const { map } = useMap();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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
    else if (lowerText.includes("household")) handleTransition("/household");
    else handleTransition("/population");
  };

  const COMMON_CHIPS = [
    "Population analysis by block in Doha",
    "Analyze establishment distribution",
    "Building distribution by type and status",
    "Compare population between Doha and Al Daayen",
  ];

  // --- Data Transformation ---
  const nationalityData = useMemo(() => {
    if (!data?.nationalityDistribution) return [];
    const total = data.nationalityDistribution.reduce(
      (acc, curr) => acc + curr.total,
      0,
    );

    return data.nationalityDistribution.map((item) => {
      const rawName = item.nationality;
      const isQatari = rawName === "Qatari";
      return {
        name: isQatari ? "Qatari Households" : "Non-Qatari Households",
        rawName,
        value: item.total,
        percent: total ? `${((item.total / total) * 100).toFixed(1)}%` : "0%",
        fill: isQatari ? COLORS.qatariGreen : COLORS.nonQatariOrange,
      };
    });
  }, [data]);

  const headStats = useMemo(() => {
    if (!data?.headOfHouseholdStats) return { qStats: null, nqStats: null };

    const getCount = (nat: string, gen: string) =>
      data.headOfHouseholdStats.find(
        (i) => i.nationality === nat && i.gender === gen,
      )?.count || 0;

    const qMale = getCount("Qatari", "Male");
    const qFemale = getCount("Qatari", "Female");
    const qTotal = qMale + qFemale;

    const nqMale = getCount("Non-Qatari", "Male");
    const nqFemale = getCount("Non-Qatari", "Female");
    const nqTotal = nqMale + nqFemale;

    const qMalePct = qTotal ? Math.round((qMale / qTotal) * 100) : 0;
    const qFemalePct = qTotal ? Math.round((qFemale / qTotal) * 100) : 0;
    const nqMalePct = nqTotal ? Math.round((nqMale / nqTotal) * 100) : 0;
    const nqFemalePct = nqTotal ? Math.round((nqFemale / nqTotal) * 100) : 0;

    const qMaleIcons = Math.round((qMalePct / 100) * 10);
    const nqMaleIcons = Math.round((nqMalePct / 100) * 10);

    return {
      qStats: {
        maleIcons: qMaleIcons,
        femaleIcons: 10 - qMaleIcons,
        text: `${qMalePct}% M | ${qFemalePct}% F`,
      },
      nqStats: {
        maleIcons: nqMaleIcons,
        femaleIcons: 10 - nqMaleIcons,
        text: `${nqMalePct}% M | ${nqFemalePct}% F`,
      },
    };
  }, [data]);

  const statsData = useMemo(() => {
    if (!data?.householdStats) return [];
    return data.householdStats.map((item) => ({
      ...item,
      size: parseFloat(item.size.toFixed(1)),
    }));
  }, [data]);

  // --- Custom Axis Tick for Municipality Filter ---
  const SelectableXAxisTick = ({ x, y, payload }: any) => {
    const isSelected = selectedMunicipalities.includes(payload.value);
    const [isHovered, setIsHovered] = useState(false);

    return (
      <g
        transform={`translate(${x},${y})`}
        style={{ cursor: "pointer" }}
        onClick={() =>
          onMunicipalityToggle && onMunicipalityToggle(payload.value)
        }
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(isSelected || isHovered) && (
          <rect
            x={-30}
            y={0}
            width={60}
            height={20}
            rx={10}
            fill={
              isSelected ? "rgba(255, 140, 105, 0.2)" : DOHA_FLAG_COLOR_RGBA_06
            }
            stroke={isSelected ? "#FF8C69" : DOHA_FLAG_COLOR}
            strokeWidth={1}
            transform="rotate(-15)"
          />
        )}
        <text
          x={0}
          y={0}
          dy={15}
          textAnchor="middle"
          fill={isSelected ? "#FF8C69" : "#fff"}
          fontSize={9}
          fontWeight={isSelected ? 700 : 500}
          transform="rotate(-15)"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <>
      {/* 1. CHARTS - MOVED TO LEFT */}
      {isRightPanelOpen && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {/* CHART 1: Nationality Pie Chart */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution of Household Held Nationality
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ width: "60%", height: "160px" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={nationalityData}
                      innerRadius={0}
                      outerRadius={70}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      onClick={(data) =>
                        onNationalityToggle && onNationalityToggle(data.rawName)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {nationalityData.map((entry, index) => {
                        const isSelected =
                          !selectedNationalities.length ||
                          selectedNationalities.includes(entry.rawName);
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            fillOpacity={isSelected ? 1 : 0.3}
                            stroke={isSelected ? "#fff" : "none"}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#fff" }}
                      // @ts-ignore
                      formatter={(val: number) => val.toLocaleString()}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{
                  width: "60%",
                  paddingLeft: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {nationalityData.map((item, index) => {
                  const isSelected =
                    !selectedNationalities.length ||
                    selectedNationalities.includes(item.rawName);
                  const opacity = isSelected ? 1 : 0.3;
                  const isHovered = hoveredItem === item.name;

                  return (
                    <div
                      key={item.name}
                      style={{
                        marginBottom: index === 0 ? "15px" : "0",
                        opacity: opacity,
                        transition: "opacity 0.3s ease",
                        cursor: "pointer",
                        backgroundColor: isHovered
                          ? DOHA_FLAG_COLOR_RGBA_06
                          : "transparent",
                        border: isHovered
                          ? `1px solid ${DOHA_FLAG_COLOR}`
                          : "1px solid transparent",
                        borderRadius: "4px",
                        padding: "2px",
                      }}
                      onClick={() =>
                        onNationalityToggle && onNationalityToggle(item.rawName)
                      }
                      onMouseEnter={() => setHoveredItem(item.name)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: item.fill,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#fff",
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          paddingLeft: "20px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: item.fill,
                          }}
                        >
                          {item.value.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            backgroundColor: "#334155",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            color: "#fff",
                          }}
                        >
                          {item.percent}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CHART 2: Head of Household (Icon Array) */}
          {headStats.qStats && headStats.nqStats && (
            <div className="glass-card">
              <div style={CHART_TITLE_STYLE}>Head of Household</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {/* Rows kept as is */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      Qatari Households
                    </span>
                    <span style={{ fontSize: "10px", color: "#e2e8f0" }}>
                      {headStats.qStats.text}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "rgba(255,255,255,0.05)",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <IconRow count={headStats.qStats.maleIcons} type="male" />
                    <IconRow
                      count={headStats.qStats.femaleIcons}
                      type="female"
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      Non-Qatari Households
                    </span>
                    <span style={{ fontSize: "10px", color: "#e2e8f0" }}>
                      {headStats.nqStats.text}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "rgba(255,255,255,0.05)",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <IconRow count={headStats.nqStats.maleIcons} type="male" />
                    <IconRow
                      count={headStats.nqStats.femaleIcons}
                      type="female"
                    />
                  </div>
                </div>

                {/* Legend with Gender Filter */}
                <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
                  {["Male", "Female"].map((gender) => {
                    const isSelected = selectedGenders.includes(gender);
                    const isHovered = hoveredItem === gender;
                    return (
                      <div
                        key={gender}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          // opacity: isSelected ? 1 : 0.4,
                          backgroundColor: isHovered
                            ? DOHA_FLAG_COLOR_RGBA_06
                            : "transparent",
                          border: isHovered
                            ? `1px solid ${DOHA_FLAG_COLOR}`
                            : "1px solid transparent",
                          padding: "2px 4px",
                          borderRadius: "4px",
                        }}
                        onClick={() => onGenderToggle && onGenderToggle(gender)}
                        onMouseEnter={() => setHoveredItem(gender)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor:
                              gender === "Male"
                                ? COLORS.qatariGreen
                                : COLORS.nonQatariOrange,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "11px",
                            color: isSelected ? "#FF8C69" : "white",
                            fontWeight: isSelected ? "700" : "400",
                          }}
                        >
                          {gender}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CHART 3: Number of Households vs Avg Size */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Number of Households vs Avg. Household Size
            </div>
            <div style={{ height: "220px", width: "100%" }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={statsData}
                  margin={{ top: 20, right: -15, bottom: 0, left: -10 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={<SelectableXAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#4ade80", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }
                    label={{
                      value: "No. of Households",
                      angle: -90,
                      position: "center",
                      fill: "#4ade80",
                      fontSize: 10,
                      dx: -15,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#fb923c", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 6]}
                    label={{
                      value: "Avg. Household Size",
                      angle: 90,
                      position: "center",
                      fill: COLORS.nonQatariOrange,
                      fontSize: 10,
                      dx: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="households"
                    barSize={12}
                    fill={COLORS.qatariGreen}
                    radius={[4, 4, 0, 0]}
                    fillOpacity={selectedMunicipalities.length === 0 ? 1 : 0.3}
                  >
                    {statsData.map((entry, index) => {
                      const isSelected =
                        selectedMunicipalities.length === 0 ||
                        selectedMunicipalities.includes(entry.name);
                      return (
                        <Cell
                          key={`cell-bar-${index}`}
                          fillOpacity={isSelected ? 1 : 0.3}
                        />
                      );
                    })}
                    <LabelList
                      dataKey="households"
                      position="top"
                      fill="#4ade80"
                      fontSize={9}
                      // @ts-ignore
                      formatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="size"
                    stroke={COLORS.nonQatariOrange}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS.nonQatariOrange, strokeWidth: 0 }}
                  >
                    <LabelList
                      dataKey="size"
                      position="top"
                      fill={COLORS.nonQatariOrange}
                      fontSize={9}
                      offset={10}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
