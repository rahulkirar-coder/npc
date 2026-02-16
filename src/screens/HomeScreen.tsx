import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { DOHA_FLAG_COLOR } from "../util";

// Animation Constants
const FADE_IN_UP = "fadeInUp 0.8s ease-out forwards";

const PEARL_STYLE: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 35%, #ffffff, #e0e0e0, #a0a0a0)",
  boxShadow: "0 0 15px rgba(255, 255, 255, 0.4)",
  marginBottom: "10px",
  opacity: 0,
  animation: FADE_IN_UP,
  animationDelay: "0s",
};

const TITLE_STYLE: React.CSSProperties = {
  color: "#fff",
  fontSize: "36px",
  fontWeight: "600",
  marginBottom: "10px",
  letterSpacing: "0.5px",
  opacity: 0,
  animation: FADE_IN_UP,
  animationDelay: "0.2s",
};

const DESC_STYLE: React.CSSProperties = {
  color: "#FFF",
  fontSize: "20px",
  fontWeight: "400",
  marginBottom: "40px",
  opacity: 0,
  animation: FADE_IN_UP,
  animationDelay: "0.4s",
};

const BUTTON_WRAPPER_STYLE: React.CSSProperties = {
  opacity: 0,
  animation: FADE_IN_UP,
  animationDelay: "0.6s",
};

const BUTTON_STYLE: React.CSSProperties = {
  // Use 'background' for gradients, not 'backgroundColor'
  background: "linear-gradient(90deg, #C9A55C 0%, #8A6E35 100%)",
  color: "#fff", // White text to match the image
  padding: "16px 32px", // Larger padding for the pill shape
  borderRadius: "50px",
  border: "none",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  // Gold glow shadow
  boxShadow: "0 10px 25px rgba(201, 165, 92, 0.4)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const WAVE_CONTAINER_STYLE: React.CSSProperties = {
  position: "absolute",
  bottom: "150px",
  left: 0,
  width: "100%",
  height: "60%",
  zIndex: 1,
  opacity: 0.8,
  pointerEvents: "none",
};

export const HomeScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div
      className="home-container"
      style={{
        background:
          "radial-gradient(circle at center, #541c1f 0%, #2a0e11 60%, #0d0406 100%)",
      }}
    >
      {/* Animation Keyframes */}
      <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
      `}</style>

      {/* Background Wave */}
      <div style={WAVE_CONTAINER_STYLE}>
        <DotLottieReact
          src="/wave.json"
          loop
          autoplay
          style={{ transform: "scale(1.8)", filter: "blur(4px)" }}
        />
      </div>

      {/* Main Content */}
      <div className="home-content">
        <div style={PEARL_STYLE} />
        <h1 style={TITLE_STYLE}>Qatar Census 2025</h1>
        <p style={DESC_STYLE}>
          Welcome to Qatar Census 2025. I am Rawi. I see you are connecting from
          <span style={{ color: "#C9A55C" }}> Doha</span>. Shall we explore how
          the nation has changed since you last looked?
        </p>

        <div style={BUTTON_WRAPPER_STYLE}>
          <button
            style={BUTTON_STYLE}
            disabled={loading}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onClick={async () => {
              try {
                setLoading(true);
                // await loadLocalCsv(); // Uncomment if logic requires pre-fetching
                navigate("/city");
              } catch (error) {
                console.error(error);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Loading..." : "Let’s Get Started →"}
          </button>
        </div>
      </div>
    </div>
  );
};
