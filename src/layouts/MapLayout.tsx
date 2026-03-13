import { Outlet } from "react-router-dom";
import { GraphArea } from "../components/GraphArea";
import { Header } from "../components/Header";

export const MapLayout = () => {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#0e131f"
      }}
    >
      <Header />
      <GraphArea />
      <div
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};
