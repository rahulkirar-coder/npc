import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BuildingRightPanel } from "../components/BuildingRightPanel";
import { Footer } from "../components/Footer";
import { setLoading, setMapLayer, type AppState } from "../state/appReducer";
import { useMap } from "react-map-gl";
import type { FillLayer, LineLayer, FillExtrusionLayer } from "react-map-gl";
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
  top: "20px",
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



// --- Styles ---
const RESET_BTN_STYLE: React.CSSProperties = {
  pointerEvents: "auto",
  backgroundColor: "#A30134",
  borderRadius: "50px",
  padding: "8px 18px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  alignItems: "center",
  transition: "all 0.2s ease",
  fontFamily: "Poppins",
  border: "none",
}

// --- Helper: Parse WKT Polygon with Z to GeoJSON & Height ---
const parseBuildingGeometry = (
  wkt: string,
): { coordinates: number[][][]; height: number } | null => {
  if (!wkt) return null;

  try {
    const match = wkt.match(/\(\((.*?)\)\)/);
    if (!match) return null;

    const coordsString = match[1];
    const points = coordsString.split(",");

    const coordinates: number[][] = [];
    let maxZ = 0;

    for (const point of points) {
      const parts = point.trim().split(/\s+/);
      if (parts.length >= 3) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const z = parseFloat(parts[2]);

        if (!isNaN(x) && !isNaN(y)) {
          coordinates.push([x, y]);
          if (!isNaN(z) && z > maxZ) {
            maxZ = z;
          }
        }
      }
    }

    if (coordinates.length < 3) return null;

    return {
      coordinates: [coordinates],
      height: maxZ,
    };
  } catch (e) {
    console.error("Error parsing building geometry:", e);
    return null;
  }
};

export const BuildingScreen = () => {
  const dispatch = useDispatch();
  const { map } = useMap();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Zone Filter
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  const [fullApiData, setFullApiData] = useState<any>(null);
  const [panelData, setPanelData] = useState<any>(null);
  const [activeMapData, setActiveMapData] = useState<Map<
    number,
    number
  > | null>(null);
  const [apiRange, setApiRange] = useState<any[] | null>(null);

  const zoneData = useSelector((state: AppState) => state.app.zoneData);
  const [blockData, setBlockData] = useState<any[] | null>(null);

  // Cache Ref for Full Building Types
  const allTypesRef = useRef<any[]>([]);

  // New State for Building Mode
  const [csvZoneIds, setCsvZoneIds] = useState<number[]>([]);
  const [buildingShapeData, setBuildingShapeData] = useState<Feature[] | null>(
    null,
  );

  const [activeYearBtn, setActiveYearBtn] = useState<2025 | 2020>(2020);
  const [viewMode, setViewMode] = useState<"zone" | "block" | "building">(
    "zone",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const isActive = useRef(true);
  const hasAnimated = useRef(false);
  const hasTransitionedYear = useRef(false);
  const hoveredZoneId = useRef<number | string | null>(null);
  const isTransitioning = useRef(false);
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
          center: [51.52, 25.29],
          zoom: 10,
          pitch: 55,
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

  const getPolygonMaxDimension = (coordinates: number[][][]): number => {
    if (!coordinates || !coordinates[0]) return 0;
    const ring = coordinates[0];
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const width = maxX - minX;
    const height = maxY - minY;
    return Math.max(width, height);
  };

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

  // --- Interaction (Hover & Click) ---
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    const onMouseMove = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["building-3d-layer", "building-extrusion-layer"],
      });

      if (features.length > 0) {
        mapInstance.getCanvas().style.cursor = "pointer";
        const featureId = features[0].id;

        if (featureId !== undefined && featureId !== null) {
          if (hoveredZoneId.current !== featureId) {
            if (
              hoveredZoneId.current !== null &&
              hoveredZoneId.current !== undefined
            ) {
              mapInstance.setFeatureState(
                { source: "building-data", id: hoveredZoneId.current },
                { hover: false },
              );
            }
            hoveredZoneId.current = featureId;
            mapInstance.setFeatureState(
              // @ts-ignore
              { source: "building-data", id: featureId },
              { hover: true },
            );
          }
        }
      } else {
        mapInstance.getCanvas().style.cursor = "";
        if (
          hoveredZoneId.current !== null &&
          hoveredZoneId.current !== undefined
        ) {
          mapInstance.setFeatureState(
            { source: "building-data", id: hoveredZoneId.current },
            { hover: false },
          );
          hoveredZoneId.current = null;
        }
      }
    };

    const onMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = "";
      if (
        hoveredZoneId.current !== null &&
        hoveredZoneId.current !== undefined
      ) {
        mapInstance.setFeatureState(
          { source: "building-data", id: hoveredZoneId.current },
          { hover: false },
        );
        hoveredZoneId.current = null;
      }
    };

    // --- CLICK LISTENER ---
    const onClick = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["building-3d-layer"],
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

    mapInstance.on("mousemove", "building-3d-layer", onMouseMove);
    mapInstance.on("mousemove", "building-extrusion-layer", onMouseMove);
    mapInstance.on("mouseleave", "building-3d-layer", onMouseLeave);
    mapInstance.on("mouseleave", "building-extrusion-layer", onMouseLeave);
    mapInstance.on("click", onClick);

    return () => {
      mapInstance.off("mousemove", "building-3d-layer", onMouseMove);
      mapInstance.off("mousemove", "building-extrusion-layer", onMouseMove);
      mapInstance.off("mouseleave", "building-3d-layer", onMouseLeave);
      mapInstance.off("mouseleave", "building-extrusion-layer", onMouseLeave);
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
      center: [51.52, 25.29],
      bearing: 20,
      pitch: 55,
      zoom: 10,
      duration: 3000,
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

  useEffect(() => {
    const fetchZoneCSV = async () => {
      try {
        const response = await fetch("/doha zone block.csv");
        const text = await response.text();
        const rows = parseRobustCSV(text);
        const ids = rows
          .map((r: any) => Number(r.zone_number))
          .filter((n: number) => !isNaN(n));
        const uniqueIds = Array.from(new Set(ids));
        setCsvZoneIds(uniqueIds);
      } catch (error) {
        console.error("Failed to load doha zone block csv:", error);
      }
    };
    fetchZoneCSV();
  }, []);

  // ... [Building shape fetch logic] ...
  useEffect(() => {
    if (
      viewMode === "building" &&
      !buildingShapeData &&
      csvZoneIds.length > 0
    ) {
      const fetchBuildingShapes = async () => {
        dispatch(
          setLoading(
            true,
            "Constructing 3D City Model (This may take ~30s)...",
            30000,
          ),
        );
        try {
          const response = await fetch(
            "https://rawi-backend.vercel.app/building/doha",
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
          );
          if (!response.ok) throw new Error("Failed to fetch building shapes");
          const json = await response.json();
          if (json.data && Array.isArray(json.data.dohaBuildings)) {
            const features = json.data.dohaBuildings
              .map((b: any, i: number) => {
                if (!b.shape) return null;
                const parsed = parseBuildingGeometry(b.shape);
                if (!parsed) return null;
                const { coordinates, height } = parsed;
                const maxDim = getPolygonMaxDimension(coordinates);
                if (maxDim > 0.0008) return null;
                return {
                  type: "Feature",
                  id: `bld-shape-${i}`,
                  geometry: {
                    type: "Polygon",
                    coordinates: coordinates,
                  },
                  properties: {
                    ...b,
                    // Parse classificationId as number for mapbox expression
                    classificationId: b.classificationId
                      ? Number(b.classificationId)
                      : undefined,
                    height: height,
                  },
                } as Feature;
              })
              .filter((f: any) => f !== null) as Feature[];
            setBuildingShapeData(features);
          }
        } catch (e) {
          console.error("Error fetching building shapes from API:", e);
        } finally {
          dispatch(setLoading(false));
        }
      };
      fetchBuildingShapes();
    }
  }, [viewMode, csvZoneIds, buildingShapeData, dispatch]);

  const handleDataUpdate = (stateData: any) => {
    const data = stateData.queryData;
    if (data && data !== lastQueryDataRef.current) {
      setFullApiData(data);
      if (data.range) {
        // CHANGED: Store full range array
        setApiRange(data.range);
      }
      if (data.typeWiseBuildings) {
        allTypesRef.current = data.typeWiseBuildings;
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
      const response = await fetch("https://rawi-backend.vercel.app/query", {
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

            if (route === "/building") {
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
        selectedStatuses.length === 0 &&
        selectedTypes.length === 0 &&
        selectedZone === null;

      if (location.state?.queryData && isDefaultFilters) {
        handleDataUpdate(location.state);
        hasUsedQueryDataRef.current = true;
        dispatch(setLoading(false));
        return;
      }

      try {
        dispatch(setLoading(true, "Mapping Building Infrastructure..."));

        const mapKeyToApi = (key: string) => {
          if (key === "under_demolition") return "Under Demolish";
          if (key === "under_construction") return "Under Construction";
          if (key === "completed") return "Completed";
          return key;
        };
        const body: any = { year: [2025, 2020] };
        if (selectedStatuses.length > 0) {
          body.status = selectedStatuses.map(mapKeyToApi);
        }
        if (selectedTypes.length > 0) {
          body.type = selectedTypes;
        }
        // Added Zone Filter
        if (selectedZone !== null) {
          body.zoneId = [selectedZone];
        }

        const apiResponse = await fetch(
          "https://rawi-backend.vercel.app/building",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!apiResponse.ok) throw new Error("Failed to fetch API");
        const json = await apiResponse.json();
        if (json.data) {
          setFullApiData(json.data);
          if (json.data.range) {
            // CHANGED: Store full range array
            setApiRange(json.data.range);
          }
          if (
            selectedTypes.length === 0 &&
            json.data.typeWiseBuildings &&
            json.data.typeWiseBuildings.length > 0
          ) {
            allTypesRef.current = json.data.typeWiseBuildings;
          }
        }
      } catch (e) {
        console.error("Error loading building data:", e);
      } finally {
        setTimeout(() => dispatch(setLoading(false)), 500);
      }
    };
    loadData();
  }, [
    selectedStatuses,
    selectedTypes,
    selectedZone, // Refetch
    dispatch,
    location.state,
  ]);

  // --- Process Data for Panel kept same ---
  useEffect(() => {
    if (!fullApiData) return;
    const y = activeYearBtn;
    const newMap = new Map<number, number>();

    if (viewMode === "zone") {
      const mapDataForYear =
        fullApiData.buildingsByZone?.filter((d: any) => Number(d.year) === y) ||
        [];
      mapDataForYear.forEach((item: any) => {
        newMap.set(Number(item.zone), Number(item.total));
      });
    } else if (viewMode === "block") {
      const blockList = fullApiData.buildingByBlock || [];
      blockList
        .filter((d: any) => Number(d.year) === y)
        .forEach((item: any) => {
          newMap.set(Number(item.blockNumber), Number(item.total));
        });
    }
    setActiveMapData(newMap);

    const typeSource =
      allTypesRef.current.length > 0
        ? allTypesRef.current
        : fullApiData.typeWiseBuildings || [];

    const processTypeDataForYear = (year: number) => {
      const yearData =
        typeSource.find((d: any) => Number(d.year) === year)?.buildingsData ||
        [];
      return yearData.map((cat: any) => {
        const subTypes = cat.subTypes || [];
        const totalCount = subTypes.reduce(
          (acc: number, curr: any) => acc + curr.count,
          0,
        );
        return {
          name: cat.type,
          value: totalCount,
        };
      });
    };
    const typeDistribution2025 = processTypeDataForYear(2025);
    const typeDistribution2020 = processTypeDataForYear(2020);

    const normalizeStatus = (apiStatus: string) => {
      const lower = apiStatus.toLowerCase();
      if (lower.includes("demolish")) return "under_demolition";
      if (lower.includes("construction")) return "under_construction";
      if (lower.includes("completed")) return "completed";
      return apiStatus;
    };
    const processYearData = (y: number) => {
      const statusData =
        fullApiData.buildingByStatus
          ?.filter((d: any) => Number(d.year) === y)
          .map((d: any) => ({
            status: normalizeStatus(d.status),
            total: d.total,
          })) || [];
      const utilityRows =
        fullApiData.buildingByUtiliYStatus?.filter(
          (d: any) => Number(d.year) === y,
        ) || [];
      const utilities = ["Electricity", "Water", "Sewage"];
      const utilityConnection = utilities.map((util) => {
        const row = utilityRows.find((r: any) => r.utilityType === util);
        return {
          utility: util,
          connected: row ? row.connected : 0,
          notConnected: row ? row.notConnected : 0,
        };
      });
      return { statusData, utilityConnection };
    };
    const data2025 = processYearData(2025);
    const data2020 = processYearData(2020);
    setPanelData({
      typeDistribution2025,
      typeDistribution2020,
      utilityConnection2025: data2025.utilityConnection,
      utilityConnection2020: data2020.utilityConnection,
      statusData2025: data2025.statusData,
      statusData2020: data2020.statusData,
      activeYear: activeYearBtn,
    });
    setIsDataLoaded(true);
  }, [fullApiData, activeYearBtn, viewMode]);

  // --- Map Layer Update ---
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    // Clean up
    if (mapInstance.getLayer("building-zone-border"))
      mapInstance.removeLayer("building-zone-border");
    if (mapInstance.getSource("building-zone-border-source"))
      mapInstance.removeSource("building-zone-border-source");

    // Standard logic
    if (viewMode === "building") {
      if (!buildingShapeData) return;
    } else {
      if (!isDataLoaded || !activeMapData) return;
    }

    let features: Feature[] = [];
    let layers: any[] = [];

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
    if (selectedZone !== null && viewMode !== "building") {
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
                properties: { ...row, building_count: count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Feature[];

      const fillLayer: FillLayer = {
        id: "building-3d-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            [
              "interpolate",
              ["linear"],
              ["get", "building_count"],
              ...colorStops,
            ],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "building-data",
      };

      const blockLineLayer: LineLayer = {
        id: "building-block-line",
        type: "line",
        paint: {
          "line-color": BLOCK_LAYER_COLOR,
          "line-width": 1,
          "line-opacity": 0.5,
        },
        source: "building-data",
      };
      layers = [fillLayer, blockLineLayer];

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
        mapInstance.addSource("building-zone-border-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [borderFeature] },
        });
        mapInstance.addLayer({
          id: "building-zone-border",
          type: "line",
          source: "building-zone-border-source",
          paint: {
            "line-color": "#FFD700",
            "line-width": 3,
            "line-opacity": 1,
          },
        });
      }
    }
    // --- CASE 2: Building View ---
    else if (viewMode === "building" && buildingShapeData) {
      features = buildingShapeData.filter((f) => {
        const bYear = Number(f.properties?.year);
        const limit = activeYearBtn === 2025 ? 2030 : 2020;
        return !bYear || bYear <= limit;
      });

      const buildingLayer: FillExtrusionLayer = {
        id: "building-extrusion-layer",
        type: "fill-extrusion",
        paint: {
          // Use classificationId for color (1-5), fallback to height gradient
          "fill-extrusion-color": [
            "match",
            ["get", "classificationId"],
            1,
            "#1a6b62",
            2,
            "#2cb9a0",
            3,
            "#d4a437",
            4,
            "#f97316",
            5,
            "#8b1538",
            // Fallback (default logic)
            [
              "interpolate",
              ["linear"],
              ["get", "height"],
              10,
              "#cfd8dc",
              30,
              "#90a4ae",
              50,
              "#607d8b",
            ],
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.95,
          "fill-extrusion-vertical-gradient": true,
        },
        source: "building-data",
      };
      layers = [buildingLayer];
    }
    // --- CASE 3: Zone View (Default) ---
    else if (viewMode === "zone" && zoneData) {
      features = zoneData
        .map((row: any, index: number) => {
          try {
            if (row.z_geojson_4326) {
              const geometry = JSON.parse(row.z_geojson_4326);
              const zoneId = Number(row.zone_number);
              const count = activeMapData ? activeMapData.get(zoneId) || 0 : 0;
              return {
                id: index,
                type: "Feature",
                geometry: geometry,
                properties: { ...row, building_count: count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((f) => f !== null) as Feature[];

      const fillLayer: FillLayer = {
        id: "building-3d-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            [
              "interpolate",
              ["linear"],
              ["get", "building_count"],
              ...colorStops,
            ],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "building-data",
      };
      layers = [fillLayer];
    }
    // --- CASE 4: Block View ---
    else if (viewMode === "block" && blockData) {
      features = blockData
        .map((row: any, index: number) => {
          try {
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = activeMapData
                ? activeMapData.get(blockNum) || 0
                : 0;
              return {
                id,
                type: "Feature",
                geometry: geometry,
                properties: { ...row, building_count: count },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter((f) => f !== null) as Feature[];

      const fillLayer: FillLayer = {
        id: "building-3d-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            [
              "interpolate",
              ["linear"],
              ["get", "building_count"],
              ...colorStops,
            ],
          ],
          "fill-opacity": 0.8,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "building-data",
      };

      const blockLineLayer: LineLayer = {
        id: "building-block-line",
        type: "line",
        paint: {
          "line-color": BLOCK_LAYER_COLOR,
          "line-width": 1,
          "line-opacity": 0.5,
        },
        source: "building-data",
      };
      layers = [fillLayer, blockLineLayer];
    }

    const geoJson: FeatureCollection = { type: "FeatureCollection", features };
    dispatch(setMapLayer("building-data", geoJson, layers));
  }, [
    activeMapData,
    isDataLoaded,
    zoneData,
    blockData,
    viewMode,
    buildingShapeData,
    activeYearBtn,
    selectedZone, // Trigger update
    dispatch,
    apiRange, // Added dependency
  ]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleResetFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
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
        } else if (viewMode === "block") {
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
    else handleTransition("/household");
  };

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
    //       <button
    //         style={TOGGLE_BUTTON_STYLE(viewMode === "building")}
    //         onClick={() => {
    //           if (viewMode !== "building" && !isTransitioning.current) {
    //             performZoomTransition(() => setViewMode("building"));
    //           }
    //         }}
    //       >
    //         Building
    //       </button>
    //     </div>
    //   </div>
    //   <div style={UI_CONTAINER_STYLE}>
    //     <div style={INTERACTIVE_STYLE}>
    //       {panelData && (
    //         <BuildingRightPanel
    //           data={panelData}
    //           onStartTransition={stopCinematicMode}
    //           selectedStatuses={selectedStatuses}
    //           onStatusToggle={handleStatusToggle}
    //           selectedTypes={selectedTypes}
    //           onTypeToggle={handleTypeToggle}
    //           onResetFilters={handleResetFilters}
    //           chatData={chatInfo}
    //           onRecommendationClick={handleRecommendationClick}
    //           onDataUpdate={handleDataUpdate}
    //         />
    //       )}
    //     </div>

    //     <div style={FOOTER_WRAPPER_STYLE}>
    //       <div style={FOOTER_POINTER_STYLE}>
    //         <Footer
    //           title={`Building Count (${viewMode == "zone"
    //               ? "Zone"
    //               : viewMode == "block"
    //                 ? "Block"
    //                 : "Building"
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
        text: chatInfo?.text ||
          `While Doha anchors the vertical commercial core housing 67% of the nation's apartments, Al Rayyan defines the 'Horizontal Villa Belt,' a purely domestic sprawl dominated by low-rise family homes.`
        ,
        question: chatInfo?.question || "Building distribution by type and status",
        recommendations: chatInfo?.recommendations,
        buttonText: "Show Employment",
        onButtonClick: () => handleTransition("/household"),
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
        title: `Building Count (${viewMode == "zone"
          ? "Zone"
          : viewMode == "block"
            ? "Block"
            : "Building"
          })`,
        minVal: min,
        maxVal: max
      }}
    >

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

        <div style={{
          display: "flex", gap: 10, marginLeft: "50px"
        }}>

        </div>


        <button style={RESET_BTN_STYLE} onClick={handleResetFilters}>
          <span>Reset Filters</span>
        </button>
      </div>

      <div style={{
        maxHeight: "75%",
        zIndex: 100,
        overflowY: "auto",
        scrollbarWidth: "none", // Firefox
        pointerEvents: "auto",
        display: "flex",
        gap: 5,
        justifyContent: "flex-end"
      }}>
        <ChartToggleBtn />

        {panelData && (
          <BuildingRightPanel
            data={panelData}
            onStartTransition={stopCinematicMode}
            selectedStatuses={selectedStatuses}
            onStatusToggle={handleStatusToggle}
            selectedTypes={selectedTypes}
            onTypeToggle={handleTypeToggle}
            onResetFilters={handleResetFilters}
            chatData={chatInfo}
            onRecommendationClick={handleRecommendationClick}
            onDataUpdate={handleDataUpdate}
          />
        )}
      </div>


    </MainLayout>
  );
};
