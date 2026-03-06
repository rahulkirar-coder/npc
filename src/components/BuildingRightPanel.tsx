import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { Building2, Hammer, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";

// --- Types ---
interface TypeDistributionItem {
  name: string;
  value: number;
}

interface BuildingStatus {
  status: string;
  total: number;
}

interface UtilityConnection {
  utility: string;
  connected: number;
  notConnected: number;
}

interface BuildingData {
  typeDistribution2025: TypeDistributionItem[];
  typeDistribution2020: TypeDistributionItem[];
  utilityConnection2025: UtilityConnection[];
  utilityConnection2020: UtilityConnection[];
  statusData2025: BuildingStatus[];
  statusData2020: BuildingStatus[];
  activeYear?: number;
}

interface Props {
  data: BuildingData | null;
  onStartTransition?: () => void;
  selectedStatuses?: string[];
  onStatusToggle?: (status: string) => void;
  selectedTypes?: string[];
  onTypeToggle?: (type: string) => void;
  // Added:
  chatData?: {
    text: string;
    recommendations: string[];
    question?: string;
  } | null;
  onRecommendationClick?: (rec: string) => void;
  onDataUpdate?: (data: any) => void;
}

const MERGED_CARD_STYLE: React.CSSProperties = {
  borderRadius: "16px",
  padding: "4px",
  display: "flex",
  alignItems: "flex-start",
  gap: "5px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const ICON_BOX_STYLE: React.CSSProperties = {
  width: "35px",
  height: "35px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const BADGE_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "10px",
  fontWeight: "700",
  color: "#fff",
  marginLeft: "auto",
};

const SELECTED_CARD_STYLE: React.CSSProperties = {
  borderColor: "#FF8C69",
  backgroundColor: "rgba(255, 140, 105, 0.15)",
  boxShadow: "0 0 15px rgba(255, 140, 105, 0.2)",
};

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

const CATEGORY_COLORS: Record<string, string> = {
  "Commercial Tower": "#636EFA",
  "Residential Building": "#EF553B",
  "Standalone Villa": "#00CC96",
  Mixed: "#AB63FA",
  Other: "#FFA15A",
};

export const BuildingRightPanel: React.FC<Props> = ({
  data,
  onStartTransition,
  selectedStatuses = [],
  onStatusToggle,
  selectedTypes = [],
  onTypeToggle,
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
    else handleTransition("/household");
  };

  // ... [Data Processing: processUtility, processTypeData, getMergedStatusStats kept same] ...
  const processUtility = (raw: UtilityConnection[]) => {
    if (!raw) return [];
    const colorMap: Record<string, string> = {
      Electricity: "#be123c",
      Water: "#f97316",
      Sewage: "#4ade80",
    };
    return raw.map((item) => {
      const total = item.connected + item.notConnected;
      return {
        name: item.utility,
        connected: item.connected,
        notConnected: item.notConnected,
        percent: total ? Math.round((item.connected / total) * 100) : 0,
        fill: colorMap[item.utility] || "#888",
      };
    });
  };

  const connectionData2025 = useMemo(
    () => processUtility(data?.utilityConnection2025 || []),
    [data],
  );
  const connectionData2020 = useMemo(
    () => processUtility(data?.utilityConnection2020 || []),
    [data],
  );

  const radialChartData =
    data?.activeYear === 2020 ? connectionData2020 : connectionData2025;

  const processTypeData = (list: TypeDistributionItem[] | undefined) => {
    if (!list) return [];
    const total = list.reduce((acc, curr) => acc + curr.value, 0);
    return list
      .map((item) => ({
        name: item.name,
        value: item.value,
        percent: total ? `${Math.round((item.value / total) * 100)}%` : "0%",
        color: CATEGORY_COLORS[item.name] || "#a855f7",
        category: item.name,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const typeData2025 = useMemo(
    () => processTypeData(data?.typeDistribution2025),
    [data],
  );
  const typeData2020 = useMemo(
    () => processTypeData(data?.typeDistribution2020),
    [data],
  );

  const totalBuildings2025 = useMemo(
    () =>
      data?.typeDistribution2025?.reduce((acc, curr) => acc + curr.value, 0) ||
      0,
    [data],
  );

  const getMergedStatusStats = (key: string) => {
    if (!data) return { val25: 0, val20: 0, growth: "0%", share: "0%" };

    const getVal = (arr: BuildingStatus[], k: string) =>
      arr?.find((i) => i.status === k)?.total || 0;
    const val25 = getVal(data.statusData2025, key);
    const val20 = getVal(data.statusData2020, key);

    const total25 =
      data.statusData2025.reduce((acc, curr) => acc + curr.total, 0) || 1;
    const share = Math.round((val25 / total25) * 100);

    const diff = val25 - val20;
    const growthVal = val20 ? (diff / val20) * 100 : 0;

    return {
      val25,
      val20,
      share: `${share}%`,
      growth: `${growthVal.toFixed(2)}%`,
      isPositive: growthVal >= 0,
    };
  };

  const getCardStyle = (statusKey: string) => {
    const isSelected = selectedStatuses.includes(statusKey);
    return isSelected
      ? { ...MERGED_CARD_STYLE, ...SELECTED_CARD_STYLE }
      : MERGED_CARD_STYLE;
  };

  // ... [Components: TypeLegendRow, StatusCard kept same] ...
  const TypeLegendRow = ({
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
          transition: "opacity 0.3s ease",
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

  const StatusCard = ({ statusKey, icon, title }: any) => {
    const stats = getMergedStatusStats(statusKey);
    const [isHovered, setIsHovered] = useState(false);
    const isSelected = selectedStatuses.includes(statusKey);

    return (
      <div
        style={{
          ...getCardStyle(statusKey),
          // marginTop: statusKey === "under_demolition" ? "12px" : "0",
          // marginLeft: statusKey === "under_construction" ? "12px" : "0",
          backgroundColor:
            isHovered && !isSelected
              ? DOHA_FLAG_COLOR_RGBA_06
              : isSelected
                ? "rgba(255, 140, 105, 0.15)"
                : "transparent",
          borderColor:
            isHovered && !isSelected
              ? DOHA_FLAG_COLOR
              : isSelected
                ? "#FF8C69"
                : "transparent",
          borderWidth: "1px",
          borderStyle: "solid",
          width: "165px",
        }}
        onClick={() => onStatusToggle && onStatusToggle(statusKey)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={ICON_BOX_STYLE}>{icon}</div>
        <div style={{ width: "100%", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <span
              style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}
            >
              {title}
            </span>
            <div style={BADGE_STYLE}>{stats.share}</div>
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#FF8C69",
              lineHeight: "1.2",
              marginBottom: "2px",
            }}
          >
            {stats.val25.toLocaleString()}
          </div>
          <div
            style={{ fontSize: "10px", fontWeight: "500", color: "#9ca3af" }}
          >
            <span style={{ color: "#4ade80", fontWeight: "700" }}>
              {stats.growth}
            </span>{" "}
            vs 2020 ({stats.val20.toLocaleString()})
          </div>
        </div>
      </div>
    );
  };

  if (!data) return null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >

      {/* CHART 1: TYPE */}
      <div className="glass-card">
        <div style={CHART_TITLE_STYLE}>Distribution by Buildings Type</div>
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
                <Pie
                  data={typeData2025}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  onClick={(data) =>
                    onTypeToggle && onTypeToggle(data.category)
                  }
                >
                  {typeData2025.map((entry, index) => (
                    <Cell
                      key={`cell-25-${index}`}
                      fill={entry.color}
                      fillOpacity={
                        !selectedTypes ||
                          selectedTypes.length === 0 ||
                          selectedTypes.includes(entry.category)
                          ? 1
                          : 0.3
                      }
                      style={{ cursor: "pointer", transition: "all 0.3s" }}
                    />
                  ))}
                </Pie>
                <Pie
                  data={typeData2020}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  onClick={(data) =>
                    onTypeToggle && onTypeToggle(data.category)
                  }
                >
                  {typeData2020.map((entry, index) => (
                    <Cell
                      key={`cell-20-${index}`}
                      fill={entry.color}
                      fillOpacity={
                        !selectedTypes ||
                          selectedTypes.length === 0 ||
                          selectedTypes.includes(entry.category)
                          ? 0.6
                          : 0.1
                      }
                      style={{ cursor: "pointer", transition: "all 0.3s" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    color: "#fff",
                    fontSize: "10px",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#fff" }}
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
                lineHeight: "1.1",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "700" }}>
                {totalBuildings2025.toLocaleString()}
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
            {typeData2025.map((item, index) => (
              <TypeLegendRow
                key={`2025-${index}`}
                item={item}
                opacity={
                  !selectedTypes.length ||
                    selectedTypes.includes(item.category || item.name)
                    ? 1
                    : 0.3
                }
                onClick={() => onTypeToggle && onTypeToggle(item.category)}
              />
            ))}
            <div style={SECTION_HEADER_STYLE}>2020</div>
            {typeData2020.map((item, index) => (
              <TypeLegendRow
                key={`2020-${index}`}
                item={item}
                opacity={
                  !selectedTypes.length ||
                    selectedTypes.includes(item.category || item.name)
                    ? 1
                    : 0.3
                }
                onClick={() => onTypeToggle && onTypeToggle(item.category)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CHART 2: STATUS */}
      <div className="glass-card">
        <div style={CHART_TITLE_STYLE}>Distribution by Building Status</div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <StatusCard
            statusKey="completed"
            title="Completed"
            icon={
              <div
                style={{
                  ...ICON_BOX_STYLE,
                  backgroundColor: "rgba(34, 197, 94, 0.2)",
                }}
              >
                <Building2 size={24} color="#4ade80" />
              </div>
            }
          />
          <StatusCard
            statusKey="under_construction"
            title="Construction"
            icon={
              <div
                style={{
                  ...ICON_BOX_STYLE,
                  backgroundColor: "rgba(249, 115, 22, 0.2)",
                }}
              >
                <Hammer size={24} color="#fb923c" />
              </div>
            }
          />
          <StatusCard
            statusKey="under_demolition"
            title="Demolition"
            icon={
              <div
                style={{
                  ...ICON_BOX_STYLE,
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                }}
              >
                <AlertTriangle size={24} color="#f87171" />
              </div>
            }
          />
        </div>
      </div>

      {/* CHART 3: UTILITY */}
      <div className="glass-card">
        <div style={CHART_TITLE_STYLE}>
          Completed building by Connection
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: "45%",
              height: "200px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="40%"
                outerRadius="100%"
                barSize={12}
                data={radialChartData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: "rgba(255,255,255,0.05)" }}
                  dataKey="percent"
                  cornerRadius={5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: "55%" }}>
            <div
              style={{
                display: "flex",
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              <div style={{ textAlign: "left", color: "#fff" }}>Type</div>
              <div
                style={{
                  flex: 1,
                  width: "45px",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                Connected
              </div>
              <div
                style={{
                  width: "45px",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                Not connected
              </div>
            </div>
            <div style={SECTION_HEADER_STYLE}>2025</div>
            {connectionData2025 &&
              [...connectionData2025].reverse().map((item: any) => (
                <div
                  key={`2025-${item.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                    fontSize: "10px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: item.fill,
                      }}
                    />
                    <span style={{ color: "#fff", fontSize: "9px" }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ flex: 1, color: "#fff", fontWeight: 700 }}>
                    {item.connected.toLocaleString()}
                  </div>
                  <div
                    style={{
                      width: "45px",
                      textAlign: "center",
                      color: "#e2e8f0",
                    }}
                  >
                    {item.notConnected.toLocaleString()}
                  </div>
                </div>
              ))}
            <div style={SECTION_HEADER_STYLE}>2020</div>
            {connectionData2020 &&
              [...connectionData2020].reverse().map((item: any) => (
                <div
                  key={`2020-${item.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                    fontSize: "10px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: item.fill,
                      }}
                    />
                    <span style={{ color: "#fff", fontSize: "9px" }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ flex: 1, color: "#fff", fontWeight: 700 }}>
                    {item.connected.toLocaleString()}
                  </div>
                  <div
                    style={{
                      width: "45px",
                      textAlign: "center",
                      color: "#e2e8f0",
                    }}
                  >
                    {item.notConnected.toLocaleString()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* end */}
    </div>
  );
};
