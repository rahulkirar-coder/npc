import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BUTTON_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg, #C9A55C 0%, #8A6E35 100%)",
  color: "#fff",
  padding: "16px 32px",
  borderRadius: "50px",
  border: "none",
  fontSize: "18px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  boxShadow: "0 10px 25px rgba(201, 165, 92, 0.4)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div style={styles.container}>
      <h1 style={styles.code}>404</h1>
      <h2 style={styles.title}>Page Not Found</h2>
      <p style={styles.text}>
        The page you are looking for doesn't exist or was moved.
      </p>

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
            navigate("/");
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Loading..." : "Go Home →"}
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8f9fa",
    textAlign: "center",
    fontFamily: "Arial",
  },
  code: {
    fontSize: "120px",
    margin: 0,
    color: "#C9A55C",
  },
  title: {
    fontSize: "32px",
    margin: "10px 0",
 color: "#C9A55C",
  },
  text: {
    fontSize: "16px",
    marginBottom: "30px",
    color: "#666",
    maxWidth: "400px",
  },
};

export default NotFound;