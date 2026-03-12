import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { EstablishmentRightPanel } from "../components/EstablishmentRightPanel";
import { Footer } from "../components/Footer";
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
import { useLocation, useNavigate } from "react-router-dom";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { COMMON_TOGGLE_TOP } from "../utils/style";
import { MainLayout } from "../wrappers/mainWrapper";
import { ChartToggleBtn } from "../components/PopulationToggleBtn";

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

export const EstablishmentScreen = () => {
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
  const [fullApiData, setFullApiData] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeMapData, setActiveMapData] = useState<Map<
    number,
    number
  > | null>(null);
  const [apiRange, setApiRange] = useState<any[] | null>(null);

  // Block Data
  const [blockData, setBlockData] = useState<any[] | null>(null);

  // Filters
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedSizeTypes, setSelectedSizeTypes] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const allActivitiesRef = useRef<any[]>([]);
  const allSizesRef = useRef<any[]>([]);

  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  const isActive = useRef(true);
  const hasAnimated = useRef(false);
  const hasTransitionedYear = useRef(false);
  const hoveredZoneId = useRef<number | null>(null);
  const isTransitioning = useRef(false);
  const hasUsedQueryDataRef = useRef(false);
  const lastQueryDataRef = useRef<any>(null);

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

  // ... [Animation and Interaction Effects kept same] ...
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

  // --- Map Interaction (Click & Hover) ---
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    const onMouseMove = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["establishment-polygon-layer"],
      });

      if (features.length > 0) {
        mapInstance.getCanvas().style.cursor = "pointer";
        const featureId = features[0].id;

        if (hoveredZoneId.current !== featureId) {
          if (hoveredZoneId.current !== null) {
            mapInstance.setFeatureState(
              { source: "establishment-data", id: hoveredZoneId.current },
              { hover: false },
            );
          }
          hoveredZoneId.current = featureId as number;
          mapInstance.setFeatureState(
            // @ts-ignore
            { source: "establishment-data", id: featureId },
            { hover: true },
          );
        }
      } else {
        mapInstance.getCanvas().style.cursor = "";
        if (hoveredZoneId.current !== null) {
          mapInstance.setFeatureState(
            { source: "establishment-data", id: hoveredZoneId.current },
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
          { source: "establishment-data", id: hoveredZoneId.current },
          { hover: false },
        );
        hoveredZoneId.current = null;
      }
    };

    // --- CLICK LISTENER ---
    const onClick = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["establishment-polygon-layer"],
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

    mapInstance.on("mousemove", "establishment-polygon-layer", onMouseMove);
    mapInstance.on("mouseleave", "establishment-polygon-layer", onMouseLeave);
    mapInstance.on("click", onClick);

    return () => {
      mapInstance.off("mousemove", "establishment-polygon-layer", onMouseMove);
      mapInstance.off(
        "mouseleave",
        "establishment-polygon-layer",
        onMouseLeave,
      );
      mapInstance.off("click", onClick);
    };
  }, [map]);

  const startCinematicAnimation = () => {
    if (!map) return;
    isActive.current = true;
    const rotate = () => {
      if (!isActive.current) return;
      const currentBearing = map.getBearing();
      map.easeTo({
        bearing: currentBearing + 10,
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

  const handleDataUpdate = (stateData: any) => {
    const data = stateData.queryData;
    if (data && data !== lastQueryDataRef.current) {
      setFullApiData(data);
      if (data.range) {
        setApiRange(data.range); // Store full array
      }
      if (data.establishmentByActivity) {
        allActivitiesRef.current = data.establishmentByActivity;
      }
      if (data.establishmentBySize) {
        allSizesRef.current = data.establishmentBySize;
      }
      lastQueryDataRef.current = data;
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

            if (route === "/establishment") {
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

  // --- Load Data via API ---
  useEffect(() => {
    const loadData = async () => {
      const isDefaultFilters =
        selectedActivities.length === 0 &&
        selectedSizeTypes.length === 0 &&
        selectedSectors.length === 0 &&
        selectedZone === null;

      if (location.state?.queryData && isDefaultFilters) {
        handleDataUpdate(location.state);
        hasUsedQueryDataRef.current = true;
        dispatch(setLoading(false));
        return;
      }

      try {
        dispatch(setLoading(true, "Scanning Business Establishments..."));
        const body: any = { year: [2025, 2020] };
        if (selectedActivities.length > 0) {
          body.economicActivity = selectedActivities;
        }
        if (selectedSizeTypes.length > 0) {
          body.employeeSizeType = selectedSizeTypes;
        }
        if (selectedSectors.length > 0) {
          body.sector = selectedSectors;
        }
        // Added Zone Filter
        if (selectedZone !== null) {
          body.zoneId = [selectedZone];
        }

        const apiResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/establishment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (apiResponse.ok) {
          const json = await apiResponse.json();
          setFullApiData(json.data);
          if (json.data?.range) {
            setApiRange(json.data.range); // Store full array
          }
          if (selectedActivities.length === 0) {
            allActivitiesRef.current = json.data.establishmentByActivity || [];
          }
          if (selectedSizeTypes.length === 0) {
            allSizesRef.current = json.data.establishmentBySize || [];
          }
        }
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setTimeout(() => dispatch(setLoading(false)), 500);
      }
    };
    loadData();
  }, [
    selectedActivities,
    selectedSizeTypes,
    selectedSectors,
    selectedZone, // Trigger reload
    dispatch,
    location.state,
  ]);

  // --- Process Data Logic kept same ---
  useEffect(() => {
    if (!fullApiData) return;
    const y = activeYearBtn;
    const estMap = new Map<number, number>();
    if (viewMode === "zone") {
      const zoneList = fullApiData.establishmentByZone || [];
      zoneList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          estMap.set(Number(item.zoneNumber), Number(item.total));
        });
    } else {
      const blockList = fullApiData.establishmentByBlock || [];
      blockList
        .filter((item: any) => Number(item.year) === y)
        .forEach((item: any) => {
          estMap.set(Number(item.blockNumber), Number(item.total));
        });
    }
    setActiveMapData(estMap);

    const sectorSource =
      allActivitiesRef.current.length > 0
        ? allActivitiesRef.current
        : fullApiData.establishmentByActivity || [];
    const topSectors2025 = sectorSource
      .filter((item: any) => Number(item.year) === 2025)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10);
    const sectorMap2020 = new Map();
    sectorSource
      .filter((item: any) => Number(item.year) === 2020)
      .forEach((item: any) => sectorMap2020.set(item.activity, item.total));
    const sectorDistribution = topSectors2025.map((item: any) => ({
      sector: item.activity,
      value2025: item.total,
      value2020: sectorMap2020.get(item.activity) || 0,
    }));
    const typeRaw = fullApiData.establishmentBySector || [];
    const typeMap = new Map();
    typeRaw.forEach((item: any) => {
      if (!typeMap.has(item.sector)) {
        typeMap.set(item.sector, {
          type: item.sector,
          est2025: 0,
          emp2025: 0,
          est2020: 0,
          emp2020: 0,
        });
      }
      const entry = typeMap.get(item.sector);
      const itemYear = Number(item.year);
      if (itemYear === 2025) {
        entry.est2025 = item.count;
        entry.emp2025 = item.employees;
      } else if (itemYear === 2020) {
        entry.est2020 = item.count;
        entry.emp2020 = item.employees;
      }
    });
    const typeDistribution = Array.from(typeMap.values());
    const sizeSource =
      allSizesRef.current.length > 0
        ? allSizesRef.current
        : fullApiData.establishmentBySize || [];
    const mapSizeData = (year: number) =>
      sizeSource
        .filter((item: any) => Number(item.year) === year)
        .map((item: any) => ({
          size: `${item.category}(${item.range})`,
          total: item.total,
          category: item.category,
        }));
    setPanelData({
      sectorDistribution,
      typeDistribution,
      sizeDistribution2025: mapSizeData(2025),
      sizeDistribution2020: mapSizeData(2020),
      activeYear: y,
    });
    setIsDataLoaded(true);
  }, [fullApiData, activeYearBtn, viewMode]);

  // --- Map Layer Update ---
  useEffect(() => {
    if (!zoneData || !activeMapData) return;
    // @ts-ignore
    const mapInstance = map.getMap();

    // Clean up
    if (mapInstance.getLayer("establishment-zone-border"))
      mapInstance.removeLayer("establishment-zone-border");
    if (mapInstance.getSource("establishment-zone-border-source"))
      mapInstance.removeSource("establishment-zone-border-source");

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
        .filter(Boolean) as Feature[];

      layerConfig = {
        id: "establishment-polygon-layer",
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
        source: "establishment-data",
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
        mapInstance.addSource("establishment-zone-border-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [borderFeature] },
        });
        mapInstance.addLayer({
          id: "establishment-zone-border",
          type: "line",
          source: "establishment-zone-border-source",
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
        id: "establishment-polygon-layer",
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
        source: "establishment-data",
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
        id: "establishment-polygon-layer",
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
        source: "establishment-data",
      };
    }

    const geoJson: FeatureCollection = { type: "FeatureCollection", features };

    const blockLineLayer: LineLayer = {
      id: "est-block-line-layer",
      type: "line",
      paint: {
        "line-color": BLOCK_LAYER_COLOR,
        "line-width": 1,
        "line-opacity": 0.5,
      },
      source: "establishment-data",
    };

    const layers =
      viewMode === "block" || selectedZone !== null
        ? [layerConfig, blockLineLayer]
        : layerConfig;

    dispatch(setMapLayer("establishment-data", geoJson, layers as any));
  }, [
    zoneData,
    blockData,
    activeMapData,
    viewMode,
    dispatch,
    apiRange, // Added dependency
    activeYearBtn, // Added dependency
  ]);

  // ... [Handlers] ...
  const handleActivityToggle = (activity: string) => {
    setSelectedActivities((prev) => {
      if (prev.includes(activity)) return prev.filter((a) => a !== activity);
      return [...prev, activity];
    });
  };

  const handleSizeTypeToggle = (sizeType: string) => {
    setSelectedSizeTypes((prev) => {
      if (prev.includes(sizeType)) return prev.filter((s) => s !== sizeType);
      return [...prev, sizeType];
    });
  };

  const handleSectorToggle = (sector: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sector)) return prev.filter((s) => s !== sector);
      return [...prev, sector];
    });
  };

  const handleResetFilters = () => {
    setSelectedActivities([]);
    setSelectedSizeTypes([]);
    setSelectedSectors([]);
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

  const totalEstablishments2025 = useMemo(() => {
    if (!panelData?.sizeDistribution2025) return 0;
    return panelData.sizeDistribution2025.reduce((acc, curr) => acc + curr.total, 0);
  }, [panelData]);

  const RaviChatText = chatInfo?.text || `This lens maps the commercial heartbeat of the nation. Tracking ${totalEstablishments2025.toLocaleString()} active Establishments. Revenue is concentrated in West Bay. The Leaderboard shows Retail Trade is the dominant activity.\n\nWe've covered their work and their businesses. Now, let's follow the population home.`;
  const RaviChatQuestion = chatInfo?.question || "Analyze establishment distribution";


  const handleTransition = (path: string) => {
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
    else handleTransition("/building");
  };

  const COMMON_CHIPS = [
    "Population analysis by block in Doha",
    "Analyze establishment distribution",
    "Building distribution by type and status",
    "Compare population between Doha and Al Daayen",
  ];
  return (
    // <div style={SCREEN_STYLE}>
    //   <LoadingOverlay />
    //   <div style={TOGGLE_STYLE}>
    //     <div style={TOGGLE_WRAPPER_STYLE}>
    //       <button
    //         style={TOGGLE_BUTTON_STYLE(activeYearBtn === 2020)}
    //         onClick={() => {
    //           if (activeYearBtn !== 2020 && !isTransitioning.current) {
    //             performZoomTransition(() => setActiveYearBtn(2020));
    //           }
    //         }}
    //       >
    //         2020
    //       </button>
    //       <button
    //         style={TOGGLE_BUTTON_STYLE(activeYearBtn === 2025)}
    //         onClick={() => {
    //           if (activeYearBtn !== 2025 && !isTransitioning.current) {
    //             performZoomTransition(() => setActiveYearBtn(2025));
    //           }
    //         }}
    //       >
    //         2025
    //       </button>
    //     </div>
    //     <div style={{ width: "10px" }}></div>
    //     <div style={TOGGLE_WRAPPER_STYLE}>
    //       <button
    //         style={TOGGLE_BUTTON_STYLE(viewMode === "zone")}
    //         onClick={() => {
    //           if (viewMode !== "zone" && !isTransitioning.current) {
    //             performZoomTransition(() => setViewMode("zone"));
    //           }
    //         }}
    //       >
    //         Zone
    //       </button>
    //       <button
    //         style={TOGGLE_BUTTON_STYLE(viewMode === "block")}
    //         onClick={() => {
    //           if (viewMode !== "block" && !isTransitioning.current) {
    //             performZoomTransition(() => setViewMode("block"));
    //           }
    //         }}
    //       >
    //         Block
    //       </button>
    //     </div>
    //   </div>

    //   <div style={UI_CONTAINER_STYLE}>
    //     <div style={INTERACTIVE_STYLE}>
    //       {panelData && (
    //         <EstablishmentRightPanel
    //           data={panelData}
    //           onResetFilters={handleResetFilters}
    //           selectedActivities={selectedActivities}
    //           onActivityToggle={handleActivityToggle}
    //           selectedSizeTypes={selectedSizeTypes}
    //           onSizeTypeToggle={handleSizeTypeToggle}
    //           selectedSectors={selectedSectors}
    //           onSectorToggle={handleSectorToggle}
    //           chatData={chatInfo}
    //           onRecommendationClick={handleRecommendationClick}
    //           onDataUpdate={handleDataUpdate}
    //         />
    //       )}
    //     </div>

    //     <div style={FOOTER_WRAPPER_STYLE}>
    //       <div style={FOOTER_POINTER_STYLE}>
    //         <Footer
    //           title={`Establishment Distribution (${viewMode == "zone" ? "Zone" : "Block"
    //             })`}
    //           minVal={min}
    //           maxVal={max}
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </div>

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

      filterTagsSet={
        [{ item: selectedActivities, toggle: handleActivityToggle },
        { item: selectedSizeTypes, toggle: handleSizeTypeToggle },
        { item: selectedSectors, toggle: handleSectorToggle },
        ]
      }
    >
      <div style={{
        display: "flex",
        gap: 5,
        justifyContent: isRightPanelOpen ? "space-between" : "flex-end",
      }}>
        <ChartToggleBtn />

        {panelData && isRightPanelOpen && (
          <div style={{
            width: "100%",
            maxHeight: "55%",
            zIndex: 100,
            overflowY: "auto",
            scrollbarWidth: "none",
            pointerEvents: "auto",
          }}>
            <EstablishmentRightPanel
              data={panelData}
              selectedActivities={selectedActivities}
              onActivityToggle={handleActivityToggle}
              selectedSizeTypes={selectedSizeTypes}
              onSizeTypeToggle={handleSizeTypeToggle}
              selectedSectors={selectedSectors}
              onSectorToggle={handleSectorToggle}
              chatData={chatInfo}
              onRecommendationClick={handleRecommendationClick}
              onDataUpdate={handleDataUpdate}
            />
          </div>
        )}
      </div>

    </MainLayout>
  );
};
