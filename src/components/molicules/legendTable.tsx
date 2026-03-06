import { useState } from "react";
import { DOHA_FLAG_COLOR, DOHA_FLAG_COLOR_RGBA_06 } from "../../util";



const LEGEND_TH_STYLE: React.CSSProperties = {
    padding: "2px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    fontWeight: 600,
    color: "#e2e8f0",
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

const LEGEND_TABLE_STYLE: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: "8px",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.1)",
};

export const LegendTable = ({
    type,
    interactive,
    selectedGender,
    onGenderToggle,
    data
}: {
    type: "complex" | "simple";
    interactive?: boolean;
    selectedGender?: any;
    onGenderToggle?: any
    data?: any
}) => {
    const [yearMode, setYearMode] = useState<"2025" | "compare">("compare");
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