export const CircleLegendIcon = ({ color, label, opacity }: { color: string, label: string, opacity?: number }) => {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    opacity: opacity,
                }}
            />
            <span>{label}</span>
        </div>
    )   
}

export const DiamondLegendIcon = ({ color, label }: { color: string, label: string }) => {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
                style={{
                    transform: "rotate(45deg)",
                    borderRadius: 0,
                    height: 7,
                    width: 7,
                    display: "inline-block",
                    backgroundColor: color,
                }}
            ></span>
            <span>{label}</span>
        </div>
    )
}