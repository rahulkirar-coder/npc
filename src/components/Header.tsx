import React from "react";

export const Header = () => {
  return (
    <div
      style={{
        position: "fixed",
        width: "100%",
        top: 0,
        left: 0,
        zIndex: 1,
      }}
    >
      <section className="top-header">
        <div className="inner-container">
          <div className="top-header-container">
            <div className="top-header-logo">
              <a href="">
                <img src="../../assets/img/q-logo.svg" alt="" />
              </a>
            </div>
            <div className="top-header-nav">
              {/* <ul>
                <li role="button">
                  <div className="search d-flex align-items-center gap-2">
                    <div className="npc-icon-search"></div>
                    <p className="m-0">Search..</p>
                  </div>
                </li>

              </ul> */}
              <div className="actions">
                <span className="action">
                  <a href="">
                    {" "}
                    <img src="../../assets/img/flag.svg" alt="" />
                  </a>{" "}
                </span>
                <span
                  className="action theme-action"
                  role="button"
                  onClick={() => {
                    console.log("Theme toggle");
                  }}
                >
                  {" "}
                  <span className="npc-icon-theam-btn"></span>{" "}
                </span>
                <span className="action">
                  <a
                    role="button"
                    data-bs-toggle="modal"
                    data-bs-target="#accesspility-modal"
                  >
                    {" "}
                    <span className="npc-icon-access"></span>
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <header className="header">
        <div className="inner-container">
          <div className="header-container">
            <div className="header-logo">
              <img src="../../assets/img/logo.svg" alt="" />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
