import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-map-gl";
import { useSelector } from "react-redux";
import type { AppState } from "../state/appReducer";
import {
    NestedButterflyChart,
    type ButterflyData,
} from "./NestedButterflyChart";

// ... [Styles and Constants] ...
const CHART_TITLE_STYLE: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#FF8C69",
    marginBottom: "5px",
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
        if (!data || !data.current || !data.current.nationality)
            return { nationalityChartData: [], nationalityMax: 100 };

        const current = data.current.nationality;
        const compare = data.comparison?.nationality || [];

        const getVal = (arr: any[], nat: string, gender: string) => {
            const found = arr.find(
                (i: any) => i.nationality === nat && i.gender === gender
            );
            return found ? found.totalPopulation : 0;
        };

        const qM = getVal(current, "Qatari", "Male");
        const qF = getVal(current, "Qatari", "Female");
        const nqM = getVal(current, "Non-Qatari", "Male");
        const nqF = getVal(current, "Non-Qatari", "Female");

        const qM20 = getVal(compare, "Qatari", "Male");
        const qF20 = getVal(compare, "Qatari", "Female");
        const nqM20 = getVal(compare, "Non-Qatari", "Male");
        const nqF20 = getVal(compare, "Non-Qatari", "Female");

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
    }, [data]);

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



    return (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px"
                    }}
                >

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
                        {/* <LegendTable type="simple" /> */}
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
                        {/* <LegendTable type="simple" /> */}
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
                        {/* <LegendTable type="simple" /> */}
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
                    </div>
                </div>
    );
};
