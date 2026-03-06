import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { BottomInputPanel } from "./BottomInputPanel";
import { RawiChatCard } from "./RawiChatCard";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../util";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";
import {
  NestedButterflyChart,
  type ButterflyData,
} from "./NestedButterflyChart";
import { COMMON_CHART_PANEL_TOP, ResetBtnStyle } from "../utils/style";

// ... [Styles and Constants] ...
const CHART_TITLE_STYLE: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#FF8C69",
  marginBottom: "5px",
};
const TOGGLE_CONTAINER_STYLE: React.CSSProperties = {
  display: "flex",
  background: "rgba(0,0,0,0.3)",
  borderRadius: "20px",
  padding: "4px",
  border: "1px solid rgba(255,255,255,0.1)",
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
};
const LEGEND_TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "8px",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  overflow: "hidden",
  background: "rgba(0,0,0,0.2)",
};
const LEGEND_TH_STYLE: React.CSSProperties = {
  padding: "2px",
  textAlign: "center",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  fontWeight: 600,
  color: "#94a3b8",
};
const LEGEND_TD_STYLE: React.CSSProperties = {
  padding: "4px",
  textAlign: "center",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};
const LEGEND_DOT_STYLE = (color: string): React.CSSProperties => ({
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  marginRight: "6px",
});
const COLORS = {
  mq: "#20852A",
  mnq: "#68EE76",
  fq: "#A33514",
  fnq: "#F25F33",
};
const darkenColor = (color: string) => {
  if (color === "#20852A") return "#15661D";
  if (color === "#68EE76") return "#2DB83B";
  if (color === "#A33514") return "#8B290B";
  if (color === "#F25F33") return "#C43F18";
  return color;
};

interface RightPanelProps {
  data: any;
  onStartTransition?: () => void;
  selectedAgeGroups?: string[];
  onAgeGroupToggle?: (group: string) => void;
  onResetFilters?: () => void;
  selectedGender?: string | null;
  onGenderToggle?: (gender: string) => void;
  selectedMaritalStatus?: string[];
  onMaritalStatusToggle?: (status: string) => void;
  selectedEducation?: string[];
  onEducationToggle?: (edu: string) => void;
  // Added Nationality Filters
  selectedNationalities?: string[];
  onNationalityToggle?: (nat: string) => void;
  chatData?: {
    text: string;
    recommendations: string[];
    question?: string;
  } | null;
  onRecommendationClick?: (rec: string) => void;
  onDataUpdate?: (data: any) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  data,
  onStartTransition,
  selectedAgeGroups = [],
  onAgeGroupToggle,
  onResetFilters,
  selectedGender,
  onGenderToggle,
  selectedMaritalStatus = [],
  onMaritalStatusToggle,
  selectedEducation = [],
  onEducationToggle,
  // Added props
  selectedNationalities = [],
  onNationalityToggle,
  chatData,
  onRecommendationClick,
  onDataUpdate,
}) => {
  const [yearMode, setYearMode] = useState<"2025" | "compare">("compare");
  const navigate = useNavigate();
  const isRightPanelOpen = useSelector(
    (state: AppState) => state.app.isRightPanelOpen,
  );
  const { map } = useMap();

  const handleTransition = (path: string) => {
    if (onStartTransition) onStartTransition();
    if (map) {
      map.stop();
      map.flyTo({ center: [51.5348, 25.2867], zoom: 9, duration: 2000 });
      map.once("moveend", () => navigate(path));
    } else {
      navigate(path);
    }
  };

  const processTextAndNavigate = () => handleTransition("/establishment");

  // --- Helper: Format Numbers ---
  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "k";
    return n.toLocaleString();
  };

  const formatLabel = (val: number, total: number) => {
    return `${fmt(val)} (${total ? ((val / total) * 100).toFixed(0) : 0}%)`;
  };

  // --- Data Transformation ---

  // 1. Pyramid / Age Data
  const populationData = useMemo(() => {
    if (!data || !data.current || !data.current.pyramid) return [];
    const current = data.current.pyramid;
    const compare = data.comparison?.pyramid || [];
    return current.map((item: any) => {
      const compItem = compare.find((c: any) => c.name === item.name);
      return {
        ...item,
        mq20: compItem ? compItem.mq : 0,
        mnq20: compItem ? compItem.mnq : 0,
        fq20: compItem ? compItem.fq : 0,
        fnq20: compItem ? compItem.fnq : 0,
      };
    });
  }, [data]);

  // 2. Age Chart Data
  const { ageChartData, ageMax } = useMemo(() => {
    if (!populationData.length) return { ageChartData: [], ageMax: 100 };

    // Calculate Total Population for %
    const totalPop = populationData.reduce(
      (acc: number, item: any) => acc + item.mq + item.mnq + item.fq + item.fnq,
      0,
    );

    const chartData: ButterflyData[] = populationData.map((item: any) => {
      const maleVal = item.mq + item.mnq;
      const femaleVal = item.fq + item.fnq;

      return {
        name: item.name,
        maleVal,
        femaleVal,
        maleVal20: item.mq20 + item.mnq20,
        femaleVal20: item.fq20 + item.fnq20,
        maleLabel: formatLabel(maleVal, totalPop),
        femaleLabel: formatLabel(femaleVal, totalPop),
      };
    });

    const max =
      Math.max(...chartData.map((d) => Math.max(d.maleVal, d.femaleVal))) ||
      100;
    return { ageChartData: chartData, ageMax: max };
  }, [populationData]);

  // 3. Nationality Chart Data
  const { nationalityChartData, nationalityMax } = useMemo(() => {
    if (!populationData.length)
      return { nationalityChartData: [], nationalityMax: 100 };

    let qM = 0,
      qF = 0,
      nqM = 0,
      nqF = 0;
    let qM20 = 0,
      qF20 = 0,
      nqM20 = 0,
      nqF20 = 0;

    populationData.forEach((item: any) => {
      qM += item.mq;
      qF += item.fq;
      nqM += item.mnq;
      nqF += item.fnq;
      qM20 += item.mq20;
      qF20 += item.fq20;
      nqM20 += item.mnq20;
      nqF20 += item.fnq20;
    });

    const totalPop = qM + qF + nqM + nqF;

    const rows: ButterflyData[] = [
      {
        name: "Qatari",
        maleVal: qM,
        femaleVal: qF,
        maleVal20: qM20,
        femaleVal20: qF20,
        maleLabel: formatLabel(qM, totalPop),
        femaleLabel: formatLabel(qF, totalPop),
      },
      {
        name: "Non-Qatari",
        maleVal: nqM,
        femaleVal: nqF,
        maleVal20: nqM20,
        femaleVal20: nqF20,
        maleLabel: formatLabel(nqM, totalPop),
        femaleLabel: formatLabel(nqF, totalPop),
      },
    ];

    const max =
      Math.max(...rows.map((d) => Math.max(d.maleVal, d.femaleVal))) || 100;
    return { nationalityChartData: rows, nationalityMax: max };
  }, [populationData]);

  // 4. Marital Data
  const { maritalChartData, maritalMax } = useMemo(() => {
    if (!data || !data.current || !data.current.marital)
      return { maritalChartData: [], maritalMax: 100 };
    const current = data.current.marital;
    const compare = data.comparison?.marital || [];

    const findCompare = (status: string, key: string) => {
      const found = compare.find((c: any) => c.name === status);
      return found ? found[key] : 0;
    };

    const totalPop = current.reduce(
      (acc: number, item: any) => acc + item.maleVal + item.femaleVal,
      0,
    );

    const chartData: ButterflyData[] = current.map((item: any) => ({
      name: item.name,
      maleVal: item.maleVal,
      femaleVal: item.femaleVal,
      maleVal20: findCompare(item.name, "maleVal"),
      femaleVal20: findCompare(item.name, "femaleVal"),
      maleLabel: formatLabel(item.maleVal, totalPop),
      femaleLabel: formatLabel(item.femaleVal, totalPop),
    }));

    const max =
      Math.max(...chartData.map((d) => Math.max(d.maleVal, d.femaleVal))) ||
      100;
    return { maritalChartData: chartData, maritalMax: max };
  }, [data]);

  // 5. Education Data
  const { educationChartData, educationMax } = useMemo(() => {
    if (!data || !data.current || !data.current.education)
      return { educationChartData: [], educationMax: 100 };
    const current = data.current.education;
    const compare = data.comparison?.education || [];

    const totalPop = current.reduce(
      (acc: number, item: any) => acc + item.Male + item.Female,
      0,
    );

    const chartData: ButterflyData[] = current.map((item: any) => {
      const compItem = compare.find((c: any) => c.name === item.name);
      let displayName = item.name;
      if (displayName.includes("Prep & Vocational"))
        displayName = "Prep &\nVocational";
      else if (displayName.includes("Read and Write"))
        displayName = "Read &\nWrite";
      else if (displayName.includes("Secondary"))
        displayName = "Secondary\n& Post";
      else if (displayName.includes("University"))
        displayName = "University\n& Above";

      return {
        name: displayName,
        rawName: item.rawName, // Store raw name for filtering
        maleVal: item.Male,
        femaleVal: item.Female,
        maleVal20: compItem ? compItem.Male : 0,
        femaleVal20: compItem ? compItem.Female : 0,
        maleLabel: formatLabel(item.Male, totalPop),
        femaleLabel: formatLabel(item.Female, totalPop),
      };
    });

    const max =
      Math.max(...chartData.map((d) => Math.max(d.maleVal, d.femaleVal))) ||
      100;
    return { educationChartData: chartData, educationMax: max };
  }, [data]);

  const LegendTable = ({
    type,
    interactive,
  }: {
    type: "complex" | "simple";
    interactive?: boolean;
  }) => {
    const [hoveredGender, setHoveredGender] = useState<string | null>(null);

    const getHeaderStyle = (gender: string) => {
      if (!interactive) return LEGEND_TH_STYLE;
      const isActive = selectedGender === gender;
      const isHovered = hoveredGender === gender;
      return {
        ...LEGEND_TH_STYLE,
        cursor: "pointer",
        backgroundColor: isActive
          ? "rgba(255, 140, 105, 0.2)"
          : isHovered
            ? DOHA_FLAG_COLOR_RGBA_06
            : "rgba(255,255,255,0.05)",
        color: isActive ? "#FF8C69" : "#94a3b8",
        borderBottom: isActive
          ? "1px solid #FF8C69"
          : isHovered
            ? `1px solid ${DOHA_FLAG_COLOR}`
            : "1px solid rgba(255,255,255,0.1)",
      };
    };

    return (
      <table style={LEGEND_TABLE_STYLE}>
        <thead>
          <tr>
            <th style={{ ...LEGEND_TH_STYLE, width: "20%" }}>Year</th>
            <th
              style={getHeaderStyle("Male")}
              onClick={() =>
                interactive && onGenderToggle && onGenderToggle("Male")
              }
              onMouseEnter={() => interactive && setHoveredGender("Male")}
              onMouseLeave={() => interactive && setHoveredGender(null)}
            >
              Male
            </th>
            <th
              style={getHeaderStyle("Female")}
              onClick={() =>
                interactive && onGenderToggle && onGenderToggle("Female")
              }
              onMouseEnter={() => interactive && setHoveredGender("Female")}
              onMouseLeave={() => interactive && setHoveredGender(null)}
            >
              Female
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...LEGEND_TD_STYLE, fontWeight: "bold" }}>
              {data?.year || 2025}
            </td>
            <td style={LEGEND_TD_STYLE}>
              {type === "complex" ? (
                <>
                  <span style={LEGEND_DOT_STYLE(COLORS.mq)}></span>Qatari
                  <span style={{ width: 8, display: "inline-block" }}></span>
                  <span style={LEGEND_DOT_STYLE(COLORS.mnq)}></span>Non-Qatari
                </>
              ) : (
                <span style={LEGEND_DOT_STYLE(COLORS.mnq)}></span>
              )}
            </td>
            <td style={LEGEND_TD_STYLE}>
              {type === "complex" ? (
                <>
                  <span style={LEGEND_DOT_STYLE(COLORS.fq)}></span>Qatari
                  <span style={{ width: 8, display: "inline-block" }}></span>
                  <span style={LEGEND_DOT_STYLE(COLORS.fnq)}></span>Non-Qatari
                </>
              ) : (
                <span style={LEGEND_DOT_STYLE(COLORS.fnq)}></span>
              )}
            </td>
          </tr>
          {yearMode === "compare" && (
            <tr>
              <td style={{ ...LEGEND_TD_STYLE, color: "white" }}>2020</td>
              <td style={{ ...LEGEND_TD_STYLE, color: "white" }}>
                {type == "complex" ? (
                  <>
                    <span
                      style={{
                        ...LEGEND_DOT_STYLE(darkenColor(COLORS.mq)),
                        transform: "rotate(45deg)",
                        borderRadius: 0,
                        height: 7,
                        width: 7,
                      }}
                    ></span>
                    Qatari
                    <span style={{ width: 8, display: "inline-block" }}></span>
                    <span
                      style={{
                        ...LEGEND_DOT_STYLE(darkenColor(COLORS.mnq)),
                        transform: "rotate(45deg)",
                        borderRadius: 0,
                        height: 7,
                        width: 7,
                      }}
                    ></span>
                    Non-Qatari
                  </>
                ) : (
                  <span
                    style={{
                      ...LEGEND_DOT_STYLE(darkenColor(COLORS.mnq)),
                      transform: "rotate(45deg)",
                      borderRadius: 0,
                      height: 7,
                      width: 7,
                    }}
                  ></span>
                )}
              </td>
              <td style={{ ...LEGEND_TD_STYLE, color: "white" }}>
                {type == "complex" ? (
                  <>
                    <span
                      style={{
                        ...LEGEND_DOT_STYLE(darkenColor(COLORS.fq)),
                        transform: "rotate(45deg)",
                        borderRadius: 0,
                        height: 7,
                        width: 7,
                      }}
                    ></span>
                    Qatari
                    <span style={{ width: 8, display: "inline-block" }}></span>
                    <span
                      style={{
                        ...LEGEND_DOT_STYLE(darkenColor(COLORS.fnq)),
                        transform: "rotate(45deg)",
                        borderRadius: 0,
                        height: 7,
                        width: 7,
                      }}
                    ></span>
                    Non-Qatari
                  </>
                ) : (
                  <span
                    style={{
                      ...LEGEND_DOT_STYLE(darkenColor(COLORS.fnq)),
                      transform: "rotate(45deg)",
                      borderRadius: 0,
                      height: 7,
                      width: 7,
                    }}
                  ></span>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <>
      <div className="top-left-panel hide-scroll">
        <RawiChatCard
          text={
            chatData?.text ||
            "Good morning. Qatar’s population is 3.7M (+4% vs 2020). 28.02% are university educated."
          }
          buttonText="Show Employment"
          onButtonClick={() => processTextAndNavigate()}
          // minHeight="60px"
          question={
            chatData?.question || "Population analysis by block in Doha"
          }
          recommendations={chatData?.recommendations}
          onRecommendationClick={onRecommendationClick}
          history={[]}
        />
      </div>

      {isRightPanelOpen && (
        <div
          className="right-side-panel"
          style={{ top: COMMON_CHART_PANEL_TOP }}
        >
          <div style={ResetBtnStyle}>
            <button style={RESET_BTN_STYLE} onClick={onResetFilters}>
              <span>Reset Filters</span>
            </button>
          </div>

          {/* --- CHART 1: Age Distribution --- */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>Distribution by Age & Gender</div>
            <div
              style={{ width: "100%", maxHeight: "300px", overflowY: "auto" }}
              className="hide-scroll"
            >
              <NestedButterflyChart
                data={ageChartData}
                maxVal={ageMax}
                selectedItems={selectedAgeGroups}
                onItemToggle={onAgeGroupToggle}
                showComparison={yearMode === "compare"}
              />
            </div>
            <LegendTable type="simple" />
          </div>

          {/* --- CHART 2: Nationality Distribution --- */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Nationality & Gender
            </div>
            <NestedButterflyChart
              data={nationalityChartData}
              maxVal={nationalityMax}
              selectedItems={selectedNationalities} // Added Selection
              onItemToggle={onNationalityToggle} // Added Handler
              showComparison={yearMode === "compare"}
            />
            <LegendTable type="simple" />
          </div>

          {/* --- CHART 3: MARITAL --- */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Marital Status & Gender
            </div>
            <NestedButterflyChart
              data={maritalChartData}
              maxVal={maritalMax}
              selectedItems={selectedMaritalStatus}
              onItemToggle={onMaritalStatusToggle}
              showComparison={yearMode === "compare"}
            />
            <LegendTable type="simple" />
          </div>

          {/* --- CHART 4: EDUCATION (Converted to Nested Butterfly) --- */}
          <div className="glass-card">
            <div style={CHART_TITLE_STYLE}>
              Distribution by Gender & Education (15+ age group)
            </div>
            <NestedButterflyChart
              data={educationChartData}
              maxVal={educationMax}
              selectedItems={selectedEducation}
              onItemToggle={onEducationToggle}
              showComparison={yearMode === "compare"}
            />
            <LegendTable type="simple" />
          </div>
        </div>
      )}

      <BottomInputPanel
        chips={chatData?.recommendations || []}
        onSubmit={processTextAndNavigate}
        onDataUpdate={onDataUpdate}
      />
    </>
  );
};
