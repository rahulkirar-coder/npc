import React, { useState, useMemo } from "react";
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
  LabelList,
  ComposedChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";

// --- Types ---
interface SectorItem {
  sector: string;
  value2025: number;
  value2020: number;
}

interface TypeItem {
  type: string;
  est2025: number;
  emp2025: number;
  est2020: number;
  emp2020: number;
}

interface SizeItem {
  size: string;
  total: number;
  category?: string;
}

interface EstablishmentDashboardData {
  sectorDistribution: SectorItem[];
  typeDistribution: TypeItem[];
  sizeDistribution2025: SizeItem[];
  sizeDistribution2020: SizeItem[];
  activeYear?: number;
}

interface Props {
  data: EstablishmentDashboardData | null;
  onResetFilters?: () => void;
  selectedActivities?: string[];
  onActivityToggle?: (activity: string) => void;
  selectedSizeTypes?: string[];
  onSizeTypeToggle?: (sizeType: string) => void;
  selectedSectors?: string[];
  onSectorToggle?: (sector: string) => void;
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
  fontWeight: "600",
  color: "#FF8C69",
  marginBottom: "8px",
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  color: "white",
  fontSize: "11px",
  fontWeight: "700",
  marginTop: "8px",
  marginBottom: "4px",
};

// --- Colors ---
const COLORS = {
  sectorBar2025: "#F97316", // Orange
  sectorBar2020: "#db2777", // Red/Pinkish
  sectorBar2020Dark: "#831843", // Dark Red for Nested
  micro: "#f97316",
  small: "#7c3aed",
  medium: "#86efac",
  large: "#ec4899",
  estGreen: "#4ade80", // Bright Green (2025)
  estGreen2020: "#166534", // Dark Green (2020)
  empOrange: "#fb923c", // Orange (2025)
  empRed2020: "#be123c", // Red (2020)
};

export const EstablishmentRightPanel: React.FC<Props> = ({
  data,
  selectedActivities = [],
  onActivityToggle,
  selectedSizeTypes = [],
  onSizeTypeToggle,
  selectedSectors = [],
  onSectorToggle,
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
    else handleTransition("/building");
  };

  // --- Data Transformation ---

  // 1. Top Sectors
  const sectorData = useMemo(() => {
    if (!data?.sectorDistribution) return [];
    return data.sectorDistribution.map((item) => ({
      name: item.sector,
      value2025: item.value2025,
      value2020: item.value2020,
    }));
  }, [data]);

  // 2. Type Distribution (Processed)
  const typeData = useMemo(() => {
    return data?.typeDistribution || [];
  }, [data]);

  // 3. Size Distribution
  const processSizeData = (list: SizeItem[]) => {
    if (!list) return [];
    const total = list.reduce((acc, curr) => acc + curr.total, 0);
    const getColor = (name: string) => {
      if (name.includes("Micro")) return COLORS.micro;
      if (name.includes("Small")) return COLORS.small;
      if (name.includes("Medium")) return COLORS.medium;
      if (name.includes("Large")) return COLORS.large;
      return "#ccc";
    };

    return list
      .map((item) => ({
        name: item.size,
        value: item.total,
        percent: total ? `${Math.round((item.total / total) * 100)}%` : "0%",
        color: getColor(item.size),
        category: item.category || item.size,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const sizeData2025 = useMemo(
    () => processSizeData(data?.sizeDistribution2025 || []),
    [data],
  );
  const sizeData2020 = useMemo(
    () => processSizeData(data?.sizeDistribution2020 || []),
    [data],
  );

  const totalEstablishments2025 = useMemo(() => {
    if (!data?.sizeDistribution2025) return 0;
    return data.sizeDistribution2025.reduce((acc, curr) => acc + curr.total, 0);
  }, [data]);

  // --- Custom Components ---

  // Custom Shape for Nested Sector Bar (Chart 1)
  const NestedSectorBarShape = (props: any) => {
    const { fill, x, y, width, height, payload, fillOpacity } = props;
    const { value2025, value2020 } = payload;

    // Safety check
    if (!value2025 && !value2020) return null;

    // Calculate width of 2020 bar relative to 2025 width (since width prop is for value2025)
    // If value2025 is 0, we can't show 2020 properly in this logic without scale access,
    // but typically top sectors have 2025 values.
    const width20 = value2025 ? (value2020 / value2025) * width : 0;

    // Styles for nested bar
    const barHeight20 = height * 0.4; // 40% height
    const y20 = y + (height - barHeight20) / 2; // Center vertically

    return (
      <g>
        {/* 2025 Bar (Main) */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={fill}
          fillOpacity={fillOpacity}
        />
        {/* 2020 Bar (Nested) */}
        {value2020 > 0 && (
          <rect
            x={x}
            y={y20}
            width={width20}
            height={barHeight20}
            rx={2}
            ry={2}
            fill={COLORS.sectorBar2020Dark}
            fillOpacity={0.9} // Slight opacity to blend or solid
          />
        )}
      </g>
    );
  };

  // NEW: Custom Tooltip for Sector Chart to show both 2025 and 2020
  const CustomSectorTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: "#1f2937",
            border: "none",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "10px",
            color: "#fff",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ marginBottom: "4px", fontWeight: 700 }}>
            {data.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "3px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "linear-gradient(to right, #F97316, #FB923C)",
                }}
              />
              <span style={{ color: "#cbd5e1" }}>2025:</span>
            </div>
            <span style={{ fontWeight: 600 }}>
              {data.value2025?.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "2px",
                  backgroundColor: COLORS.sectorBar2020Dark,
                }}
              />
              <span style={{ color: "#cbd5e1" }}>2020:</span>
            </div>
            <span style={{ fontWeight: 600 }}>
              {data.value2020?.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tick for Y-Axis Selection (Horizontal Chart)
  const SelectableYAxisTick = ({ x, y, payload }: any) => {
    const isSelected = selectedActivities.includes(payload.value);
    const [isHovered, setIsHovered] = useState(false);

    return (
      <g
        transform={`translate(${x},${y})`}
        style={{ cursor: "pointer" }}
        onClick={() => onActivityToggle && onActivityToggle(payload.value)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(isSelected || isHovered) && (
          <rect
            x={-140} // Adjusted for wider labels
            y={-10}
            width={145}
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
          dy={3}
          textAnchor="end"
          fill={isSelected ? "#FF8C69" : "#fff"}
          fontSize={9}
          fontWeight={isSelected ? 700 : 500}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // Custom Tick for X-Axis Selection (Chart 2)
  const SelectableXAxisTick = ({ x, y, payload }: any) => {
    const isSelected = selectedSectors.includes(payload.value); // Use selectedSectors for Chart 2
    const [isHovered, setIsHovered] = useState(false);

    return (
      <g
        transform={`translate(${x},${y})`}
        style={{ cursor: "pointer" }}
        onClick={() => onSectorToggle && onSectorToggle(payload.value)}
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
          textAnchor="end"
          fill={isSelected ? "#FF8C69" : "#fff"}
          fontSize={9}
          fontWeight={isSelected ? 700 : 500}
          transform="rotate(-15)"
        >
          {payload.value.length > 15
            ? payload.value.substring(0, 15) + "..."
            : payload.value}
        </text>
      </g>
    );
  };

  const NestedEstBarShape = (props: any) => {
    const { fill, x, y, width, height, payload } = props;
    const val25 = payload.est2025;
    const val20 = payload.est2020;

    // Draw Inner Bar (2020)
    let innerPath = null;
    if (val20 > 0 && val25 > 0) {
      const h20 = (val20 / val25) * height;
      const y20 = y + (height - h20);
      const w20 = width * 0.5;
      const x20 = x + (width - w20) / 2;
      // @ts-ignore
      innerPath = (
        <rect
          x={x20}
          y={y20}
          width={w20}
          height={h20}
          fill={COLORS.estGreen2020}
          rx={2}
          ry={2}
        />
      );
    }

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={4}
          ry={4}
        />
        {innerPath}
      </g>
    );
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width + 5}
        y={y + height / 2}
        fill="#fff"
        fontSize={9}
        fontWeight={600}
        textAnchor="start"
        dominantBaseline="middle"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  const SizeLegendRow = ({
    item,
    opacity,
    onClick,
  }: {
    item: any;
    opacity: number;
    onClick?: () => void;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: "10px",
          color: "#e2e8f0",
          justifyContent: "space-between",
          marginBottom: "3px",
          opacity: opacity,
          transition: "all 0.3s ease",
          cursor: "pointer",
          padding: "2px 4px",
          borderRadius: "4px",
          backgroundColor: isHovered ? DOHA_FLAG_COLOR_RGBA_06 : "transparent",
          border: isHovered
            ? `1px solid ${DOHA_FLAG_COLOR}`
            : "1px solid transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: item.color,
              marginRight: "6px",
            }}
          />
          <div style={{ fontWeight: 500 }}>{item.name}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ fontWeight: 700 }}>{item.value.toLocaleString()}</div>
          <div style={{ color: "#94a3b8", width: "25px", textAlign: "right" }}>
            {item.percent}
          </div>
        </div>
      </div>
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
          {/* CHART 1: Sector Distribution (REVERTED TO HORIZONTAL + NESTED) */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Economic Activity
            </div>
            <div style={{ height: "170px" }}>
              <ResponsiveContainer>
                <BarChart
                  layout="vertical"
                  data={sectorData}
                  margin={{ top: 0, right: 35, left: 15, bottom: 0 }}
                  barCategoryGap="15%"
                  barGap={0}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140} // Increased width for full names
                    tick={<SelectableYAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    content={<CustomSectorTooltip />}
                  />
                  <defs>
                    <linearGradient
                      id="barGradient2025"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#FB923C" />
                    </linearGradient>
                  </defs>

                  {/* 2025 Bar (Main) with Nested 2020 Bar Inside */}
                  <Bar
                    dataKey="value2025"
                    fill="url(#barGradient2025)"
                    shape={<NestedSectorBarShape />}
                    barSize={12}
                    name="value2025"
                  >
                    <LabelList
                      dataKey="value2025"
                      content={renderCustomBarLabel}
                      position="right"
                    />
                    {sectorData.map((entry, index) => {
                      const isSelected =
                        !selectedActivities.length ||
                        selectedActivities.includes(entry.name);
                      return (
                        <Cell
                          key={`cell-25-${index}`}
                          fillOpacity={isSelected ? 1 : 0.3}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* New Legend for Chart 1 */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "4px",
                paddingLeft: "5px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    background: "linear-gradient(to right, #F97316, #FB923C)",
                  }}
                ></div>
                <span
                  style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}
                >
                  2025
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "9px",
                    height: "9px",
                    backgroundColor: COLORS.sectorBar2020,
                    transform: "rotate(45deg)",
                  }}
                ></div>
                <span
                  style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}
                >
                  2020
                </span>
              </div>
            </div>
          </div>

          {/* CHART 2: Type Distribution (Composed Chart) */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Sector and Employees
            </div>
            <div style={{ height: "220px", width: "100%" }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={typeData}
                  margin={{ top: 10, right: -10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />

                  {/* Shared X-Axis */}
                  <XAxis
                    dataKey="type"
                    tick={<SelectableXAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={50}
                  />

                  {/* Left Y-Axis: Establishments */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: COLORS.estGreen, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }
                    label={{
                      value: "Establishments",
                      angle: -90,
                      position: "center",
                      fill: COLORS.estGreen,
                      fontSize: 10,
                      dx: -15,
                    }}
                  />

                  {/* Right Y-Axis: Employees */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: COLORS.empOrange, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }
                    label={{
                      value: "Employees",
                      angle: 90,
                      position: "center",
                      fill: COLORS.empOrange,
                      fontSize: 10,
                      dx: 15,
                    }}
                  />

                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      color: "#fff",
                      fontSize: "10px",
                      borderRadius: "8px",
                    }}
                  />

                  {/* BARS: Establishments (2025 Outer + 2020 Inner) */}
                  <Bar
                    yAxisId="left"
                    dataKey="est2025"
                    name="Establishments 2025"
                    fill={COLORS.estGreen}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    shape={<NestedEstBarShape />}
                  >
                    {typeData.map((entry, index) => {
                      const isSelected = selectedSectors.includes(entry.type);
                      return (
                        <Cell
                          key={`cell-est-${index}`}
                          fillOpacity={
                            isSelected || selectedSectors.length === 0 ? 1 : 0.3
                          }
                        />
                      );
                    })}
                  </Bar>

                  {/* LINES: Employees */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="emp2025"
                    name="Employees 2025"
                    stroke={COLORS.empOrange}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS.empOrange }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="emp2020"
                    name="Employees 2020"
                    stroke={COLORS.empRed2020}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: COLORS.empRed2020 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend for Chart 2 */}
            <div
              style={{
                marginTop: "12px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: "8px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  fontSize: "10px",
                }}
              >
                {/* 2025 Legend */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: "2px",
                    }}
                  >
                    2025
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "100px",
                        background: COLORS.estGreen,
                      }}
                    />
                    <span style={{ color: "#cbd5e1" }}>
                      Establishment (Bar)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 2,
                        background: COLORS.empOrange,
                      }}
                    />
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: COLORS.empOrange,
                      }}
                    />
                    <span style={{ color: "#cbd5e1" }}>Employees (Line)</span>
                  </div>
                </div>

                {/* 2020 Legend */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: "2px",
                    }}
                  >
                    2020
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        // borderRadius: "2px",
                        background: COLORS.estGreen2020,
                        transform: "rotate(45deg)",
                      }}
                    />
                    <span style={{ color: "#cbd5e1" }}>
                      Establishment (Nested)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 2,
                        background: COLORS.empRed2020,
                        borderTop: "1px dashed",
                      }}
                    />
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: COLORS.empRed2020,
                      }}
                    />
                    <span style={{ color: "#cbd5e1" }}>Employees (Dotted)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHART 3: Establishment Size (Layered Donut - Interactive) */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Establishment Size
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ width: "40%", height: "160px", position: "relative" }}
              >
                <ResponsiveContainer>
                  <PieChart>
                    {/* Outer Ring: 2025 */}
                    <Pie
                      data={sizeData2025}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      onClick={(data) =>
                        onSizeTypeToggle && onSizeTypeToggle(data.category)
                      }
                    >
                      {sizeData2025.map((entry, index) => {
                        const isSelected =
                          !selectedSizeTypes ||
                          selectedSizeTypes.length === 0 ||
                          selectedSizeTypes.includes(entry.category);
                        return (
                          <Cell
                            key={`cell-25-${index}`}
                            fill={entry.color}
                            fillOpacity={isSelected ? 1 : 0.3}
                            style={{
                              cursor: "pointer",
                              transition: "all 0.3s",
                            }}
                          />
                        );
                      })}
                    </Pie>
                    {/* Inner Ring: 2020 */}
                    <Pie
                      data={sizeData2020}
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      onClick={(data) =>
                        onSizeTypeToggle && onSizeTypeToggle(data.category)
                      }
                    >
                      {sizeData2020.map((entry, index) => {
                        const isSelected =
                          !selectedSizeTypes ||
                          selectedSizeTypes.length === 0 ||
                          selectedSizeTypes.includes(entry.category);
                        return (
                          <Cell
                            key={`cell-20-${index}`}
                            fill={entry.color}
                            fillOpacity={isSelected ? 0.6 : 0.1}
                            style={{
                              cursor: "pointer",
                              transition: "all 0.3s",
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 1000 }}
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        color: "#fff",
                        fontSize: "10px",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#fff" }}
                      // @ts-ignore
                      formatter={(val: number) => val.toLocaleString()}
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
                    lineHeight: "1.1",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700" }}>
                    {totalEstablishments2025.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: "500" }}>Est.</div>
                </div>
              </div>

              <div
                style={{
                  width: "58%",
                  paddingLeft: "5px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={SECTION_HEADER_STYLE}>2025</div>
                {sizeData2025.map((item, index) => {
                  const isSelected =
                    !selectedSizeTypes.length ||
                    selectedSizeTypes.includes(item.category || item.name);
                  return (
                    <SizeLegendRow
                      key={`2025-${index}`}
                      item={item}
                      opacity={isSelected ? 1 : 0.3}
                      onClick={() =>
                        onSizeTypeToggle &&
                        onSizeTypeToggle(item.category || item.name)
                      }
                    />
                  );
                })}
                <div style={SECTION_HEADER_STYLE}>2020</div>
                {sizeData2020.map((item, index) => {
                  const isSelected =
                    !selectedSizeTypes.length ||
                    selectedSizeTypes.includes(item.category || item.name);
                  return (
                    <SizeLegendRow
                      key={`2020-${index}`}
                      item={item}
                      opacity={isSelected ? 1 : 0.3}
                      onClick={() =>
                        onSizeTypeToggle &&
                        onSizeTypeToggle(item.category || item.name)
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>


        </div>
      )}


    </>
  );
};
