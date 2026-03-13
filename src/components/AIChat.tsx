import React, { useState, useEffect } from "react";
import { Mic, Send } from "lucide-react";
import { useScribe } from "@elevenlabs/react";
import { BASE_URL } from "../util";
import { useNavigate, useLocation } from "react-router-dom";
import { useMap } from "react-map-gl";
import { useDispatch } from "react-redux";
import { setLoading } from "../state/appReducer";

// --- Styles ---
const INPUT_BAR_STYLE: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(19, 27, 40, 0.8)",
  border: "none",
  borderRadius: "30px",
  padding: "12px 20px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#fff",
  boxShadow: "0 4px 40px rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(35px)",
  WebkitBackdropFilter: "blur(35px)",
  pointerEvents: "auto",
  position: "relative",
};

const INPUT_FIELD_STYLE: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#e2e8f0",
  flex: 1,
  fontSize: "14px",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  zIndex: 10,
};

const PEARL_ICON_STYLE: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 35%, #ffffff, #e0e0e0, #a0a0a0)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  zIndex: 10,
};

const ICON_STYLE: React.CSSProperties = {
  cursor: "pointer",
  zIndex: 10,
};

interface QuestionItem {
  question: string;
  screen: string;
}

interface BottomInputPanelProps {
  chips: string[];
  onSubmit: (text: string) => void;
  placeholder?: string;
  onDataUpdate?: (data: any) => void;
  // Added style prop for positioning overrides
  style?: React.CSSProperties;
}

export const BottomInputPanel: React.FC<BottomInputPanelProps> = ({
  chips,
  onSubmit,
  placeholder = "Ask RAWI about Qatar's urban Landscape...",
  onDataUpdate,
  style,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [apiQuestions, setApiQuestions] = useState<QuestionItem[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { map } = useMap();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/question/default`,
        );
        if (response.ok) {
          const json = await response.json();
          if (json.data && Array.isArray(json.data.defaultQuestions)) {
            const path = location.pathname.replace("/", "");
            if (!path) {
              setApiQuestions([]);
              return;
            }
            const screenKey = path.charAt(0).toUpperCase() + path.slice(1);
            // console.log({ screenKey });
            const matchedScreen = json.data.defaultQuestions.find(
              (s: any) => s.screen === screenKey,
            );
            // console.log({ matchedScreen }, matchedScreen.questions);
            if (matchedScreen && Array.isArray(matchedScreen.questions)) {
              // API returns string[], map to QuestionItem[]
              setApiQuestions(
                matchedScreen.questions.map((q: string) => ({
                  question: q,
                  screen: "",
                })),
              );
            } else {
              setApiQuestions([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };

    fetchQuestions();
  }, [location.pathname]);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      if (data.text) setInputValue(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text) setInputValue(data.text);
    },
  });

  const fetchTokenFromServer = async (): Promise<string> => {
    try {
      const response = await fetch(`${BASE_URL}/population/token`);
      const data = await response.json();
      return data.data.token || "";
    } catch (error) {
      console.error("Error fetching scribe token:", error);
      return "";
    }
  };

  const handleMicClick = async () => {
    if (scribe.isConnected) {
      await scribe.disconnect();
    } else {
      const token = await fetchTokenFromServer();
      if (token) {
        await scribe.connect({
          token,
          languageCode: "eng",
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }
    }
  };

  const handleSubmit = async (overrideText?: string) => {
    const queryText = overrideText || inputValue;
    if (!queryText.trim()) return;

    dispatch(setLoading(true, "Processing Query..."));

    try {

      let sessionId = localStorage.getItem("sessionID");

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, threadId: sessionId ? sessionId : null }),
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.ouptput;
        setInputValue("");

        localStorage.setItem("sessionID", json?.sessionId);

        const isGeneric = json.genericQuery;
        // Prioritize summary (markdown), fallback to txt
        const summaryText = data?.summary || data?.txt || "";
        const recommendations = [
          json.recommandationOne?.txt,
          json.recommandationTwo?.txt,
          json.recommandationThree?.txt,
        ].filter(Boolean);

        // 1. Generic Query: Stay on same screen, update Chat only
        if (isGeneric) {
          const chatState = {
            queryData: null, // No graph data
            summary: summaryText,
            question: data?.query,
            recommendations: recommendations,
          };

          // If on a screen that accepts updates, update it
          if (onDataUpdate) {
            onDataUpdate(chatState);
          }
          // Do not navigate
          dispatch(setLoading(false));
          return;
        }

        // 2. Specific Query: Navigate or Update Screen Data..
        if (data && data.graphScreeen) {
          let route = "";
          switch (data.graphScreeen) {
            case "building_units":
              route = "/building";
              break;
            case "establishments":
              route = "/establishment";
              break;
            case "population":
              route = "/population";
              break;
            case "disability":
              route = "/disability";
              break;
            case "employment":
              route = "/employment";
              break;
            case "household":
              route = "/household";
              break;
          }

          if (route) {
            // Data Payload
            const navigationState = {
              queryData: data,
              summary: summaryText, // Updated to use summary
              question: data.query, // Extracted query text from API response
              recommendations: recommendations,
            };

            // Check if we are already on this screen
            if (location.pathname === route && onDataUpdate) {
              onDataUpdate(navigationState);
              dispatch(setLoading(false));
              return;
            }

            // Navigate to new screen
            if (map) {
              map.stop();
              map.flyTo({
                center: [51.5348, 25.2867],
                zoom: 9,
                pitch: 0,
                bearing: 0,
                duration: 2000,
                essential: true,
              });
              map.once("moveend", () =>
                navigate(route, { state: navigationState }),
              );
            } else {
              navigate(route, { state: navigationState });
            }
            return;
          }
        }
      }

      onSubmit(queryText);
    } catch (error) {
      console.error("Error submitting query:", error);
      setInputValue("");
      onSubmit(queryText);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleChipClick = (question: string, route?: string) => {
    // setInputValue(question);

    if (route) {
      if (map) {
        map.stop();
        map.flyTo({
          center: [51.5348, 25.2867],
          zoom: 9,
          pitch: 0,
          bearing: 0,
          duration: 2000,
          essential: true,
        });
        map.once("moveend", () => navigate(route));
      } else {
        navigate(route);
      }
    } else {
      handleSubmit(question);
    }
  };

  const chipsToDisplay = [
    ...(chips || []).map((c) => ({ question: c, screen: "" })),
    ...apiQuestions,
  ];
  const uniqueChips = chipsToDisplay
    .filter((v, i, a) => a.findIndex((t) => t.question === v.question) === i)
    .slice(0, 6);

  return (
    <div
      className={
        window.location.pathname !== "/city"
          ? ""
          : "bottom-middle-panel"
      }
      style={window.location.pathname !== "/city" ? { width: "100%" } : { width: "400px" }}
    >
      <div className="chips-container" style={{ width: window.location.pathname !== "/city" ? "100%" : "800px" }}>
        {uniqueChips.map((chip, index) => (
          <div
            key={index}
            className="action-chip"
            onClick={() => handleChipClick(chip.question, chip.screen)}
          >
            {chip.question}
          </div>
        ))}
      </div>

      <div style={INPUT_BAR_STYLE} className="fancy">
        <div style={PEARL_ICON_STYLE} />
        <Mic
          size={18}
          color={scribe.isConnected ? "#ef4444" : "#94a3b8"}
          style={{
            ...ICON_STYLE,
            transform: scribe.isConnected ? "scale(1.1)" : "scale(1)",
          }}
          onClick={handleMicClick}
        />
        <input
          type="text"
          placeholder={scribe.isConnected ? "Listening..." : placeholder}
          style={INPUT_FIELD_STYLE}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Send
          size={18}
          color="#94a3b8"
          style={ICON_STYLE}
          onClick={() => handleSubmit()}
        />
      </div>
    </div>
  );
};
