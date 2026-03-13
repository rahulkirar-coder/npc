import { useState, useEffect } from "react";

export const Header = () => {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const isTablet = width >= 768 && width <= 1024;
  const isLaptop = width > 1024 && width <= 1536;

  const containerPadding = isTablet
    ? "10px 20px"
    : isLaptop
    ? "10px 40px"
    : "10px 80px";

  const logoSize = isTablet ? "140px" : isLaptop ? "160px" : "181px";

  const iconSize = isTablet ? 28 : isLaptop ? 30 : 32;

  const actionsStyle = {
    display: "flex",
    gap: isTablet ? "10px" : "16px",
  };

  const actionStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${iconSize}px`,
    height: `${iconSize}px`,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.4)",
  };

  const actionLinkStyle = {
    display: "flex",
    width: "100%",
    height: "100%",
    borderRadius: "100%",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      style={{
        width: "100%",
        height: isTablet ? "80px" : "100px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: containerPadding,
        }}
      >
        <img
          src="../../assets/img/q-logo.svg"
          alt="logo"
          style={{ maxWidth: logoSize }}
        />

        <div style={actionsStyle}>
          <span style={actionStyle}>
            <a href="" style={actionLinkStyle}>
              <img
                src="../../assets/img/flag.svg"
                alt="flag"
                style={{ width: isTablet ? "16px" : "20px" }}
              />
            </a>
          </span>

          <span
            style={actionStyle}
            role="button"
            onClick={() => console.log("Theme toggle")}
          >
            <span className="npc-icon-theam-btn"></span>
          </span>

          <span style={actionStyle}>
            <a
              role="button"
              data-bs-toggle="modal"
              data-bs-target="#accesspility-modal"
              style={actionLinkStyle}
            >
              <span className="npc-icon-access"></span>
            </a>
          </span>
        </div>
      </div>

      {/* Bottom Header */}
      <div
        style={{
          display: "flex",
          width: "100%",
          padding: containerPadding,
        }}
      >
        <img
          src="../../assets/img/logo.svg"
          alt="main-logo"
          style={{ maxWidth: logoSize }}
        />
      </div>
    </div>
  );
};