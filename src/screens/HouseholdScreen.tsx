import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  HouseholdRightPanel,
  type HouseholdDashboardData,
} from "../components/HouseholdRightPanel";
import { setLoading, setMapLayer, type AppState } from "../state/appReducer";
import { useMap } from "react-map-gl";
import type { FillLayer, LineLayer } from "react-map-gl";
import type { FeatureCollection, Feature } from "geojson";
import {
  BLOCK_LAYER_COLOR,
  HOVER_COLOR,
  parseRobustCSV,
  ZOOM_OUT_VAL,
  DOHA_FLAG_COLOR,
} from "../util";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useLocation, useNavigate } from "react-router-dom";
import { COMMON_TOGGLE_TOP } from "../utils/style";
import { ChartToggleBtn } from "../components/PopulationToggleBtn";
import { MainLayout } from "../wrappers/mainWrapper";

// ... [styles remain same] ...
const SCREEN_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const UI_CONTAINER_STYLE: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

const INTERACTIVE_STYLE: React.CSSProperties = {
  pointerEvents: "auto",
};

const TOGGLE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: COMMON_TOGGLE_TOP,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 150,
  pointerEvents: "auto",
  display: "flex",
};

const TOGGLE_WRAPPER_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(19, 27, 40, 0.9)",
  borderRadius: "30px",
  padding: "4px",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  display: "flex",
  gap: "4px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
};

const TOGGLE_BUTTON_STYLE = (active: boolean): React.CSSProperties => ({
  padding: "8px 24px",
  borderRadius: "24px",
  border: "none",
  background: active ? DOHA_FLAG_COLOR : "transparent",
  color: active ? "#fff" : "#94a3b8",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  outline: "none",
});

const FOOTER_WRAPPER_STYLE: React.CSSProperties = {
  position: "absolute",
  bottom: "0px",
  left: "0px",
  width: "100%",
  pointerEvents: "none",
  display: "flex",
  justifyContent: "center",
  zIndex: 100,
};

const FOOTER_POINTER_STYLE: React.CSSProperties = {
  pointerEvents: "auto",
  marginBottom: "30px",
};

export const HouseholdScreen = () => {
  const dispatch = useDispatch();
  const { map } = useMap();
  const location = useLocation();
  const navigate = useNavigate();

  //Reducer
  const isRightPanelOpen = useSelector(
    (state: AppState) => state.app.isRightPanelOpen,
  );

  // State
  const [activeYearBtn, setActiveYearBtn] = useState<2025 | 2020>(2020);
  const [viewMode, setViewMode] = useState<"zone" | "block">("zone");

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fullApiData, setFullApiData] = useState<any>(null);
  const [panelData, setPanelData] = useState<HouseholdDashboardData | null>(
    null,
  );
  const [activeMapData, setActiveMapData] = useState<Map<
    number,
    number
  > | null>(null);

  // Filters State
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>(
    [],
  );
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<
    string[]
  >([]);

  // Zone Filter
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  const cachedNationalityDistribution = useRef<any[]>([]);
  const [blockData, setBlockData] = useState<any[] | null>(null);

  const isActive = useRef(true);
  const hasAnimated = useRef(false);
  const hasTransitionedYear = useRef(false);
  const isTransitioning = useRef(false);
  const hoveredZoneId = useRef<number | null>(null);
  const hasUsedQueryDataRef = useRef<any>(null);
  const [apiRange, setApiRange] = useState<any[] | null>(null);

  const [chatInfo, setChatInfo] = useState<{
    text: string;
    recommendations: string[];
    question?: string;
  } | null>(null);

  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  const stopCinematicMode = () => {
    isActive.current = false;
    if (map) map.stop();
  };

  const performZoomTransition = (onComplete: () => void) => {
    if (!map || isTransitioning.current) return;
    isTransitioning.current = true;
    stopCinematicMode();
    map.flyTo({ zoom: ZOOM_OUT_VAL, duration: 3000, essential: true });
    setTimeout(() => {
      onComplete();
      setTimeout(() => {
        map.flyTo({
          center: [51.5348, 25.2867],
          zoom: 10,
          pitch: 60,
          duration: 3000,
          essential: true,
        });
        setTimeout(() => {
          isTransitioning.current = false;
        }, 3000);
      }, 100);
    }, 3000);
  };

  // ... [Effects for interaction/animation kept same] ...
  useEffect(() => {
    isActive.current = true;
    if (map) {
      const interactionEvents = [
        "mousedown",
        "touchstart",
        "wheel",
        "dragstart",
        "contextmenu",
      ];
      const handleInteraction = () => {
        if (isActive.current) stopCinematicMode();
      };
      interactionEvents.forEach((evt) => map.on(evt, handleInteraction));
      return () => {
        isActive.current = false;
        if (map) map.stop();
        interactionEvents.forEach((evt) => map.off(evt, handleInteraction));
      };
    }
  }, [map]);

  useEffect(() => {
    if (map && isDataLoaded && !hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => {
        if (isActive.current) startCinematicAnimation();
      }, 100);
    }
  }, [map, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && !hasTransitionedYear.current && map) {
      const timer = setTimeout(() => {
        hasTransitionedYear.current = true;
        performZoomTransition(() => {
          setActiveYearBtn(2025);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, map]);

  const startCinematicAnimation = () => {
    if (!map) return;
    isActive.current = true;
    const rotate = () => {
      if (!isActive.current) return;
      const currentBearing = map.getBearing();
      map.easeTo({
        bearing: currentBearing + 5,
        duration: 4000,
        easing: (t) => t,
      });
      map.once("moveend", () => {
        requestAnimationFrame(() => {
          if (isActive.current) rotate();
        });
      });
    };
    map.flyTo({
      center: [51.5348, 25.2867],
      bearing: 45,
      pitch: 60,
      zoom: 10,
      duration: 2500,
      essential: true,
    });
    map.once("moveend", () => {
      requestAnimationFrame(() => {
        if (isActive.current) rotate();
      });
    });
  };

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await fetch("/block.csv");
        const text = await response.text();
        const rows = parseRobustCSV(text);
        setBlockData(rows);
      } catch (error) {
        console.error("Failed to load block data:", error);
      }
    };
    fetchBlocks();
  }, []);

  const handleDataUpdate = (stateData: any) => {
    const data = stateData.queryData;
    if (data && data !== hasUsedQueryDataRef.current) {
      setFullApiData(data);
      if (data.range) {
        // CHANGED: Store full array
        setApiRange(data.range);
      }
      hasUsedQueryDataRef.current = data;
    }
    if (stateData.summary || stateData.recommendations) {
      setChatInfo({
        text: stateData.summary,
        recommendations: stateData.recommendations || [],
        question: stateData.question,
      });
    }
  };

  const handleRecommendationClick = async (question: string) => {
    dispatch(setLoading(true, "Processing Recommendation..."));
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.ouptput;

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
            const navigationState = {
              queryData: data,
              summary: data.txt,
              question: data.query,
              recommendations: [
                json.recommandationOne?.txt,
                json.recommandationTwo?.txt,
              ].filter(Boolean),
            };

            if (route === "/household") {
              handleDataUpdate(navigationState);
            } else {
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
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // --- Load Data via API with Filters ---
  useEffect(() => {
    const loadData = async () => {
      const isDefaultFilters =
        selectedNationalities.length === 0 &&
        selectedGenders.length === 0 &&
        selectedMunicipalities.length === 0 &&
        selectedZone === null;

      if (location.state?.queryData && isDefaultFilters) {
        handleDataUpdate(location.state);
        dispatch(setLoading(false));
        return;
      }

      try {
        dispatch(setLoading(true, "Household Demographics..."));

        const body: any = { year: [2025, 2020] };

        // Add filters if selected
        if (selectedNationalities.length > 0) {
          body.nationality = selectedNationalities;
        }
        if (selectedGenders.length > 0) {
          body.gender = selectedGenders;
        }
        if (selectedMunicipalities.length > 0) {
          body.municipality = selectedMunicipalities;
        }
        // Added Zone Filter
        if (selectedZone !== null) {
          body.zoneId = [selectedZone];
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/household`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) throw new Error("API Error");
        const json = await response.json();
        setFullApiData(json.data);
        if (json.data?.range) {
          // CHANGED: Store full array
          setApiRange(json.data.range);
        }
      } catch (e) {
        console.error("Error loading household data:", e);
      } finally {
        setTimeout(() => dispatch(setLoading(false)), 500);
      }
    };
    loadData();
  }, [
    selectedNationalities,
    selectedGenders,
    selectedMunicipalities,
    selectedZone, // Refetch on zone click
    dispatch,
    location.state,
  ]);

  // --- Process Data Logic kept same ---
  useEffect(() => {
    if (!fullApiData) return;
    const y = activeYearBtn;

    const hhMap = new Map<number, number>();

    if (viewMode === "zone") {
      const zoneList = fullApiData.houseHoldByZone || [];
      zoneList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          hhMap.set(Number(item.zone), Number(item.totalHouseHold));
        });
    } else {
      const blockList = fullApiData.houseHoldByBlock || [];
      blockList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          hhMap.set(Number(item.block), Number(item.totalHouseHold));
        });
    }
    setActiveMapData(hhMap);

    const nationalityRaw = fullApiData.houseHoldByNationality || [];
    let nationalityDistribution = nationalityRaw
      .filter((item: any) => Number(item.year) === y)
      .map((item: any) => ({
        nationality: item.nationality,
        total: item.totalHouseHold,
      }));

    if (selectedNationalities.length === 0) {
      cachedNationalityDistribution.current = nationalityDistribution;
    } else {
      if (cachedNationalityDistribution.current.length > 0) {
        nationalityDistribution = cachedNationalityDistribution.current;
      }
    }

    const headRaw = fullApiData.headOfHouseHold || [];
    const headOfHouseholdStats = headRaw
      .filter((item: any) => Number(item.year) === y)
      .map((item: any) => ({
        nationality: item.nationality,
        gender: item.gender,
        count: item.totalHouseHold,
      }));

    const muniRaw = fullApiData.houseHoldByMuncipalties || [];
    const householdStats = muniRaw
      .filter((item: any) => Number(item.year) === y)
      .map((item: any) => ({
        name: item.municipality,
        households: item.totalHouseHold,
        size: item.avg,
      }))
      .sort((a: any, b: any) => b.households - a.households);

    setPanelData({
      nationalityDistribution,
      headOfHouseholdStats,
      householdStats,
    });

    setIsDataLoaded(true);
  }, [fullApiData, activeYearBtn, viewMode]);

  // --- Map Layer Update ---
  useEffect(() => {
    if (!zoneData || !activeMapData) return;
    // @ts-ignore
    const mapInstance = map.getMap();

    if (mapInstance.getLayer("household-zone-border"))
      mapInstance.removeLayer("household-zone-border");
    if (mapInstance.getSource("household-zone-border-source"))
      mapInstance.removeSource("household-zone-border-source");

    let features: Feature[] = [];
    let layerConfig: FillLayer;

    // --- Dynamic Color Stops ---
    let minRange = 0;
    let maxRange = 7000;

    // Find range based on active year
    if (apiRange && Array.isArray(apiRange)) {
      const currentYearRange = apiRange.find(
        (r: any) => r.year === activeYearBtn,
      );

      if (currentYearRange) {
        if (viewMode === "zone" && selectedZone === null) {
          minRange = currentYearRange.minZoneRange || 0;
          maxRange = currentYearRange.maxZoneRange || 7000;
        } else {
          // Blocks
          minRange = currentYearRange.minBlockRange || 0;
          maxRange = currentYearRange.maxBlockRange || 7000;
        }
      }
    }

    // Gradient Colors
    const colors = [
      "#1a6b62",
      "#22937f",
      "#2cb9a0",
      "#5dd4b8",
      "#d4a437",
      "#e8a945",
      "#f97316",
      "#8b1538",
    ];

    const colorStops: any[] = [0, "transparent"];

    if (maxRange > minRange) {
      const step = (maxRange - minRange) / (colors.length - 1);
      colors.forEach((color, i) => {
        let val = Math.floor(minRange + step * i);
        if (val <= 0) val = 1;
        colorStops.push(val, color);
      });
    } else {
      colorStops.push(1, colors[0]);
    }

    // --- CASE 1: Zone Selected (Show Blocks) ---
    if (selectedZone !== null) {
      if (!blockData || !activeMapData || !zoneData) return;

      features = blockData
        .map((row: any, index: number) => {
          try {
            if (Number(row.zone_number) !== selectedZone) return null;
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = activeMapData.get(blockNum) || 0;
              return {
                id,
                type: "Feature",
                geometry,
                properties: { ...row, count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((f) => f !== null) as Feature[];

      layerConfig = {
        id: "household-polygon-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            ["interpolate", ["linear"], ["get", "count"], ...colorStops],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "household-data",
      };

      // Draw Zone Border
      const zoneFeature = zoneData.find(
        (z) => Number(z.zone_number) === selectedZone,
      );
      if (zoneFeature && zoneFeature.z_geojson_4326) {
        const geo = JSON.parse(zoneFeature.z_geojson_4326);
        const borderFeature = {
          type: "Feature",
          geometry: geo,
          properties: {},
        } as Feature;
        mapInstance.addSource("household-zone-border-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [borderFeature] },
        });
        mapInstance.addLayer({
          id: "household-zone-border",
          type: "line",
          source: "household-zone-border-source",
          paint: {
            "line-color": "#FFD700",
            "line-width": 3,
            "line-opacity": 1,
          },
        });
      }
    }
    // --- CASE 2: Zone View ---
    else if (viewMode === "zone") {
      features = zoneData
        .map((row: any, index: number) => {
          try {
            if (row.z_geojson_4326) {
              const geometry = JSON.parse(row.z_geojson_4326);
              const zoneId = Number(row.zone_number);
              const count = activeMapData.get(zoneId) || 0;
              return {
                id: index,
                type: "Feature",
                geometry: geometry,
                properties: { ...row, count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((f) => f !== null) as Feature[];

      layerConfig = {
        id: "household-polygon-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            ["interpolate", ["linear"], ["get", "count"], ...colorStops],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "household-data",
      };
    }
    // --- CASE 3: Block View ---
    else {
      if (!blockData) return;
      features = blockData
        .map((row: any, index: number) => {
          try {
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = activeMapData.get(blockNum) || 0;
              return {
                id,
                type: "Feature",
                geometry,
                properties: { ...row, count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((f) => f !== null) as Feature[];

      layerConfig = {
        id: "household-polygon-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            ["interpolate", ["linear"], ["get", "count"], ...colorStops],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "household-data",
      };
    }

    const geoJson: FeatureCollection = { type: "FeatureCollection", features };

    const blockLineLayer: LineLayer = {
      id: "household-block-line-layer",
      type: "line",
      paint: {
        "line-color": BLOCK_LAYER_COLOR,
        "line-width": 1,
        "line-opacity": 0.5,
      },
      source: "household-data",
    };

    const layers =
      viewMode === "block" || selectedZone !== null
        ? [layerConfig, blockLineLayer]
        : layerConfig;

    dispatch(setMapLayer("household-data", geoJson, layers as any));
  }, [
    zoneData,
    blockData,
    activeMapData,
    viewMode,
    selectedZone, // Trigger update
    dispatch,
    map,
    apiRange, // Added dependency
    activeYearBtn, // Added dependency
  ]);

  // --- Interaction (Hover & Click) ---
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    const onMouseMove = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["household-polygon-layer"],
      });

      if (features.length > 0) {
        mapInstance.getCanvas().style.cursor = "pointer";
        const featureId = features[0].id;

        if (hoveredZoneId.current !== featureId) {
          if (hoveredZoneId.current !== null) {
            mapInstance.setFeatureState(
              { source: "household-data", id: hoveredZoneId.current },
              { hover: false },
            );
          }
          hoveredZoneId.current = featureId as number;
          mapInstance.setFeatureState(
            // @ts-ignore
            { source: "household-data", id: featureId },
            { hover: true },
          );
        }
      } else {
        mapInstance.getCanvas().style.cursor = "";
        if (hoveredZoneId.current !== null) {
          mapInstance.setFeatureState(
            { source: "household-data", id: hoveredZoneId.current },
            { hover: false },
          );
          hoveredZoneId.current = null;
        }
      }
    };

    const onMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = "";
      if (hoveredZoneId.current !== null) {
        mapInstance.setFeatureState(
          { source: "household-data", id: hoveredZoneId.current },
          { hover: false },
        );
        hoveredZoneId.current = null;
      }
    };

    // --- CLICK LISTENER ---
    const onClick = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["household-polygon-layer"],
      });

      if (features.length > 0) {
        const feature = features[0];
        const zoneId = Number(feature.properties?.zone_number);
        if (zoneId) {
          setSelectedZone(zoneId);
        }
      } else {
        // Deselect
        setSelectedZone(null);
      }
    };

    mapInstance.on("mousemove", "household-polygon-layer", onMouseMove);
    mapInstance.on("mouseleave", "household-polygon-layer", onMouseLeave);
    mapInstance.on("click", onClick);

    return () => {
      mapInstance.off("mousemove", "household-polygon-layer", onMouseMove);
      mapInstance.off("mouseleave", "household-polygon-layer", onMouseLeave);
      mapInstance.off("click", onClick);
    };
  }, [map]);

  const handleNationalityToggle = (val: string) => {
    setSelectedNationalities((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val],
    );
  };

  const handleGenderToggle = (val: string) => {
    setSelectedGenders((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val],
    );
  };

  const handleMunicipalityToggle = (val: string) => {
    setSelectedMunicipalities((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val],
    );
  };

  const handleResetFilters = () => {
    setSelectedNationalities([]);
    setSelectedGenders([]);
    setSelectedMunicipalities([]);
    setSelectedZone(null); // Reset Zone
  };

  const getMinMax = () => {
    if (apiRange && Array.isArray(apiRange)) {
      const currentYearRange = apiRange.find(
        (r: any) => r.year === activeYearBtn,
      );
      if (currentYearRange) {
        if (viewMode === "zone") {
          return {
            min: currentYearRange.minZoneRange,
            max: currentYearRange.maxZoneRange,
          };
        } else {
          return {
            min: currentYearRange.minBlockRange,
            max: currentYearRange.maxBlockRange,
          };
        }
      }
    }
    return { min: 0, max: 0 };
  };

  const { min, max } = getMinMax();

  const RaviChatText = chatInfo?.text || `Shift your focus to the 'Household Lens.' This view is vital for community planning. Doha, with smaller average household sizes, likely hosting singles and couples; and Al Rayyan, peaking at 4.5 persons per household, cementing its status as the 'Family Capital' of the country.`;
  const RaviChatQuestion = chatInfo?.question || "Analyze Household Demographics";

  const handleTransition = (path: string) => {
    if (stopCinematicMode) stopCinematicMode();
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
      map.once("moveend", () => navigate(path));
    } else {
      navigate(path);
    }
  };

  const processTextAndNavigate = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return;
    if (lowerText.includes("establishment")) handleTransition("/establishment");
    else if (lowerText.includes("building")) handleTransition("/building");
    else if (lowerText.includes("population")) handleTransition("/population");
    else if (lowerText.includes("employment")) handleTransition("/employment");
    else if (lowerText.includes("household")) handleTransition("/household");
    else handleTransition("/population");
  };

  const COMMON_CHIPS = [
    "Population analysis by block in Doha",
    "Analyze establishment distribution",
    "Building distribution by type and status",
    "Compare population between Doha and Al Daayen",
  ];

  return (
    <MainLayout
      leftSideRaviChatData={{
        text: RaviChatText,
        question: RaviChatQuestion,
        recommendations: chatInfo?.recommendations,
        buttonText: "Show Employment",
        onButtonClick: () => handleTransition("/establishment"),
        onRecommendationClick: handleRecommendationClick
      }}

      leftSideChatInputData={{
        chips: chatInfo?.recommendations || COMMON_CHIPS,
        onSubmit: processTextAndNavigate,
        onDataUpdate: handleDataUpdate
      }}

      middleTopData={{
        activeYear: activeYearBtn,
        viewMode: viewMode,
        isTransitioning: isTransitioning,
        onChangeYear: (year) => performZoomTransition(() => setActiveYearBtn(year)),
        onChangeViewMode: (mode) => performZoomTransition(() => {
          setViewMode(mode);
          setSelectedZone(null);
        })
      }}

      middleBottomData={{
        title: `Employment Distribution (${viewMode == "zone" ? "Zone" : "Block"})`,
        minVal: min,
        maxVal: max
      }}

      onReset={handleResetFilters}

      filterTagsSet={[
        { item: selectedNationalities, toggle: handleNationalityToggle },
        { item: selectedGenders, toggle: handleGenderToggle },
        { item: selectedMunicipalities, toggle: handleMunicipalityToggle },
      ]}
    >
      <div style={{
        display: "flex",
        gap: 5,
        height: "100%",
        overflowY: "auto",
        scrollbarWidth: "none",
        zIndex: 100,
        pointerEvents: "auto",
      }}>

        {panelData && isRightPanelOpen && (
          <HouseholdRightPanel
            data={panelData}
            onStartTransition={stopCinematicMode}
            selectedNationalities={selectedNationalities}
            onNationalityToggle={handleNationalityToggle}
            selectedGenders={selectedGenders}
            onGenderToggle={handleGenderToggle}
            selectedMunicipalities={selectedMunicipalities}
            onMunicipalityToggle={handleMunicipalityToggle}
            chatData={chatInfo}
            onRecommendationClick={handleRecommendationClick}
            onDataUpdate={handleDataUpdate}
          />
        )}
      </div>

    </MainLayout>
  );
};
