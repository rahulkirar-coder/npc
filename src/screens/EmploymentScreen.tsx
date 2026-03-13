import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { EmploymentRightPanel } from "../components/EmploymentRightPanel";
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
import { MainLayout } from "../wrappers/mainWrapper";
import { ChartToggleBtn } from "../components/PopulationToggleBtn";

// ... [STYLES KEPT SAME] ...
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

export const EmploymentScreen = () => {
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

  // Zone Filter
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  const [panelData, setPanelData] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [economyMap, setEconomyMap] = useState<Map<number, number> | null>(
    null,
  );
  const [fullApiData, setFullApiData] = useState<any>(null);
  const [apiRange, setApiRange] = useState<any[] | null>(null);

  // Filter State
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Block Data
  const [blockData, setBlockData] = useState<any[] | null>(null);

  // Access global zone data from Redux
  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  // Track Interaction State
  const hoveredZoneId = useRef<number | null>(null);
  const isTransitioning = useRef(false);
  const hasTransitionedYear = useRef(false);
  const isActive = useRef(true);
  const hasAnimated = useRef(false);
  const hasUsedQueryDataRef = useRef(false);
  const lastQueryDataRef = useRef<any>(null);

  // Chat Data State
  const [chatInfo, setChatInfo] = useState<{
    text: string;
    recommendations: string[];
    question?: string;
  } | null>(null);

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

  // --- Logic for updating data from Query API (Same Screen) ---
  const handleDataUpdate = (stateData: any) => {
    const data = stateData.queryData;
    // Only update API data if valid chart data is provided (not null/generic)
    if (data && data !== lastQueryDataRef.current) {
      setFullApiData(data);
      if (data.range) {
        setApiRange(data.range); // Store full array
      }
      lastQueryDataRef.current = data;
    }

    // Always update Chat if summary is present (handles generic queries too)
    if (stateData.summary || stateData.recommendations) {
      setChatInfo({
        text: stateData.summary,
        recommendations: stateData.recommendations || [],
        question: stateData.question,
      });
    }
  };

  // --- Logic for Recommendations Click (Call API manually) ---
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

            // If same screen, update locally
            if (route === "/employment") {
              handleDataUpdate(navigationState);
            } else {
              // Navigate
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

  // --- Load Data via API ---
  useEffect(() => {
    const loadData = async () => {
      // 1. CHECK FOR PASSED DATA FROM INPUT QUERY
      const isDefaultFilters =
        selectedActivities.length === 0 &&
        selectedSkills.length === 0 &&
        selectedZone === null;

      if (location.state?.queryData && isDefaultFilters) {
        handleDataUpdate(location.state);
        hasUsedQueryDataRef.current = true;
        dispatch(setLoading(false));
        return; // STOP HERE
      }

      try {
        dispatch(setLoading(true, "Employment Economy..."));

        const body: any = { year: [2025, 2020] };

        // Add filters
        if (selectedActivities.length > 0) {
          body.activity = selectedActivities;
        }
        if (selectedSkills.length > 0) {
          body.skillLevel = selectedSkills;
        }
        if (selectedZone !== null) {
          body.zoneId = [selectedZone];
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/economy`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );

        if (response && response.ok) {
          const json = await response.json();
          setFullApiData(json.data);
          if (json.data?.range) {
            setApiRange(json.data.range); // Store full array
          }
        }
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setTimeout(() => {
          dispatch(setLoading(false));
        }, 500);
      }
    };
    loadData();
  }, [
    selectedActivities,
    selectedSkills,
    selectedZone, // Re-fetch on zone selection
    dispatch,
    location.state,
  ]);

  // --- Process Data based on Active Year ---
  useEffect(() => {
    if (!fullApiData) return;
    const y = activeYearBtn;

    // 1. Map Data
    const econMap = new Map<number, number>();
    if (viewMode === "zone") {
      const zoneList = fullApiData.byZone || [];
      zoneList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          econMap.set(Number(item.zone), Number(item.totalPopulation));
        });
    } else {
      const blockList = fullApiData.byBlock || [];
      blockList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          econMap.set(Number(item.block), Number(item.totalPopulation));
        });
    }
    setEconomyMap(econMap);

    // 2. Chart 1: Economic Activities (Butterfly - Dual Year)
    const activityRaw = fullApiData.byActivity || [];
    // Group all data by activity name to merge 2025 and 2020 data
    const activityGrouped: any = {};

    activityRaw.forEach((item: any) => {
      const name = item.main_econ_actvty_lkpmea_desc_eng;
      const yr = Number(item.year);
      const count = Number(item.totalPopulation);
      const gender = item.gender;
      const nat = item.nationality;

      if (!activityGrouped[name]) {
        activityGrouped[name] = {
          name,
          mq25: 0,
          mnq25: 0,
          fq25: 0,
          fnq25: 0,
          mq20: 0,
          mnq20: 0,
          fq20: 0,
          fnq20: 0,
        };
      }

      if (yr === 2025) {
        if (gender === "Male" && nat === "Qatari")
          activityGrouped[name].mq25 += count;
        if (gender === "Male" && nat === "Non-Qatari")
          activityGrouped[name].mnq25 += count;
        if (gender === "Female" && nat === "Qatari")
          activityGrouped[name].fq25 += count;
        if (gender === "Female" && nat === "Non-Qatari")
          activityGrouped[name].fnq25 += count;
      } else if (yr === 2020) {
        if (gender === "Male" && nat === "Qatari")
          activityGrouped[name].mq20 += count;
        if (gender === "Male" && nat === "Non-Qatari")
          activityGrouped[name].mnq20 += count;
        if (gender === "Female" && nat === "Qatari")
          activityGrouped[name].fq20 += count;
        if (gender === "Female" && nat === "Non-Qatari")
          activityGrouped[name].fnq20 += count;
      }
    });

    const economyDistributionData = Object.values(activityGrouped).sort(
      (a: any, b: any) => {
        // Sort by total 2025 population descending
        const totalA = a.mq25 + a.mnq25 + a.fq25 + a.fnq25;
        const totalB = b.mq25 + b.mnq25 + b.fq25 + b.fnq25;
        return totalB - totalA;
      },
    );

    // 3. Chart 2: Skill Level (Dummy Dual Year Data)
    const skillLevelGraph = [
      {
        name: "High Skill",
        mq25: 450000,
        mnq25: 380000,
        fq25: 350000,
        fnq25: 300000,
        mq20: 250000,
        mnq20: 180000,
        fq20: 150000,
        fnq20: 100000,
      },
      {
        name: "Medium Skill",
        mq25: 650000,
        mnq25: 780000,
        fq25: 550000,
        fnq25: 620000,
        mq20: 450000,
        mnq20: 580000,
        fq20: 350000,
        fnq20: 420000,
      },
      {
        name: "Low Skill",
        mq25: 350000,
        mnq25: 520000,
        fq25: 410000,
        fnq25: 380000,
        mq20: 150000,
        mnq20: 320000,
        fq20: 210000,
        fnq20: 180000,
      },
    ];

    // 4. Chart 3: Sector Data (Process for both years)
    const sectorRaw = fullApiData.bySector || [];

    const processSector = (year: number) => {
      const list = sectorRaw
        .filter((item: any) => Number(item.year) === year)
        .map((item: any) => ({
          name: item.sector,
          value: item.totalPopulation,
        }));

      const total = list.reduce(
        (acc: number, curr: any) => acc + curr.value,
        0,
      );
      return list.map((item: any) => ({
        ...item,
        percent: total ? `${Math.round((item.value / total) * 100)}%` : "0%",
      }));
    };

    const sectorData2025 = processSector(2025);
    const sectorData2020 = processSector(2020);

    setPanelData({
      economyDistributionData,
      skillLevelGraph,
      sectorData2025,
      sectorData2020,
    });

    setIsDataLoaded(true);
  }, [fullApiData, activeYearBtn, viewMode]);

  // --- Handle Filter Selections ---

  const handleActivityToggle = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity],
    );
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleResetFilters = () => {
    setSelectedActivities([]);
    setSelectedSkills([]);
    setSelectedZone(null); // Reset zone
  };

  // --- Map Layer Update ---
  useEffect(() => {
    if (!zoneData) return;
    // @ts-ignore
    const mapInstance = map.getMap();

    // Clean up existing zone border
    if (mapInstance.getLayer("employment-zone-border"))
      mapInstance.removeLayer("employment-zone-border");
    if (mapInstance.getSource("employment-zone-border-source"))
      mapInstance.removeSource("employment-zone-border-source");

    let features: Feature[] = [];
    let layerConfig: FillLayer;

    // --- Dynamic Color Stops ---
    let minRange = 0;
    let maxRange = 100000;

    // Find range based on active year
    if (apiRange && Array.isArray(apiRange)) {
      const currentYearRange = apiRange.find(
        (r: any) => r.year === activeYearBtn,
      );

      if (currentYearRange) {
        if (viewMode === "zone" && selectedZone === null) {
          minRange = currentYearRange.minZoneRange || 0;
          maxRange = currentYearRange.maxZoneRange || 100000;
        } else {
          // Blocks
          minRange = currentYearRange.minBlockRange || 0;
          maxRange = currentYearRange.maxBlockRange || 100000;
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
      if (!blockData || !economyMap || !zoneData) return;

      features = blockData
        .map((row: any, index: number) => {
          try {
            if (Number(row.zone_number) !== selectedZone) return null;
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = economyMap.get(blockNum) || 0;
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
        .filter(Boolean) as Feature[];

      layerConfig = {
        id: "employment-flat-layer",
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
        source: "employment-data",
      };

      // Draw Selected Zone Border
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
        mapInstance.addSource("employment-zone-border-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [borderFeature] },
        });
        mapInstance.addLayer({
          id: "employment-zone-border",
          type: "line",
          source: "employment-zone-border-source",
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
      if (!economyMap) return;
      features = zoneData
        .map((row: any, index: number) => {
          try {
            if (row.z_geojson_4326) {
              const geometry = JSON.parse(row.z_geojson_4326);
              const zoneId = Number(row.zone_number);
              const count = economyMap.get(zoneId) || 0;
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
        id: "employment-flat-layer",
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
        source: "employment-data",
      };
    }
    // --- CASE 3: Block View (Standard) ---
    else {
      if (!blockData || !economyMap) return;
      features = blockData
        .map((row: any, index: number) => {
          try {
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = economyMap.get(blockNum) || 0;
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
        id: "employment-flat-layer",
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
        source: "employment-data",
      };
    }

    const geoJson: FeatureCollection = { type: "FeatureCollection", features };

    const blockLineLayer: LineLayer = {
      id: "employment-block-line-layer",
      type: "line",
      paint: {
        "line-color": BLOCK_LAYER_COLOR,
        "line-width": 1,
        "line-opacity": 0.5,
      },
      source: "employment-data",
    };

    const layers =
      viewMode === "block" || selectedZone !== null
        ? [layerConfig, blockLineLayer]
        : layerConfig;

    dispatch(setMapLayer("employment-data", geoJson, layers as any));
  }, [
    viewMode,
    selectedZone,
    zoneData,
    blockData,
    economyMap,
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
        layers: ["employment-flat-layer"],
      });
      if (features.length > 0) {
        mapInstance.getCanvas().style.cursor = "pointer";
        const featureId = features[0].id;
        if (hoveredZoneId.current !== featureId) {
          if (hoveredZoneId.current !== null) {
            mapInstance.setFeatureState(
              { source: "employment-data", id: hoveredZoneId.current },
              { hover: false },
            );
          }
          hoveredZoneId.current = featureId as number;
          mapInstance.setFeatureState(
            // @ts-ignore
            { source: "employment-data", id: featureId },
            { hover: true },
          );
        }
      } else {
        mapInstance.getCanvas().style.cursor = "";
        if (hoveredZoneId.current !== null) {
          mapInstance.setFeatureState(
            { source: "employment-data", id: hoveredZoneId.current },
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
          { source: "employment-data", id: hoveredZoneId.current },
          { hover: false },
        );
        hoveredZoneId.current = null;
      }
    };

    // --- CLICK LISTENER ---
    const onClick = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["employment-flat-layer"],
      });

      if (features.length > 0) {
        const feature = features[0];
        const zoneId = Number(feature.properties?.zone_number);
        if (zoneId) {
          setSelectedZone(zoneId);
        }
      } else {
        // Deselect on background click
        setSelectedZone(null);
      }
    };

    mapInstance.on("mousemove", "employment-flat-layer", onMouseMove);
    mapInstance.on("mouseleave", "employment-flat-layer", onMouseLeave);
    mapInstance.on("click", onClick);

    return () => {
      mapInstance.off("mousemove", "employment-flat-layer", onMouseMove);
      mapInstance.off("mouseleave", "employment-flat-layer", onMouseLeave);
      mapInstance.off("click", onClick);
    };
  }, [map]);

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

  const RaviChatText = chatInfo?.text || `The 'Skills Intensity' map visualizes a distinct segregation through color—intense reds mark the low-skilled industrial zones to the south, contrasting with the green high-skilled administrative hubs in the center.`
  const RaviChatQuestion = chatInfo?.question || "Analyze workforce distribution by Economic Activity"

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
    else handleTransition("/establishment");
  };

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
        chips: chatInfo?.recommendations || [],
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

      filterTagsSet={
        [{ item: selectedActivities, toggle: handleActivityToggle },
        { item: selectedSkills, toggle: handleSkillToggle }]
      }
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
          <EmploymentRightPanel
            data={panelData}
            onStartTransition={stopCinematicMode}
            selectedActivities={selectedActivities}
            onActivityToggle={handleActivityToggle}
            selectedSkills={selectedSkills}
            onSkillToggle={handleSkillToggle}
            chatData={chatInfo}
            onRecommendationClick={handleRecommendationClick}
            onDataUpdate={handleDataUpdate}
          />
        )}
      </div>

    </MainLayout>
  );
};
