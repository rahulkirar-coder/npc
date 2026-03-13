export const Header = () => {
  const topHeaderNav = {
    display: "flex",
    alignItems: "center",
    gap: "28px",
  };

  const actionsStyle = {
    display: "flex",
    gap: "16px",
  };

  const actionStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
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
        height: "100px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          // backgroundColor: "#030f1f",
          padding: "10px 60px",
        }}
      >
        <img src="../../assets/img/q-logo.svg" alt="" />

        <div style={topHeaderNav}>
          <div style={actionsStyle}>
            <span style={actionStyle}>
              <a href="" style={actionLinkStyle}>
                <img src="../../assets/img/flag.svg" alt="" />
              </a>
            </span>

            <span
              style={actionStyle}
              role="button"
              onClick={() => {
                console.log("Theme toggle");
              }}
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
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          padding: "10px 60px",
        }}
      >
        <img
          src="../../assets/img/logo.svg"
          alt=""
          style={{ maxWidth: "181px" }}
        />
      </div>
    </div>
  );
};