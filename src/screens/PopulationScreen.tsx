import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RightPanel } from "../components/PopulationRight";
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
import { ChartToggleBtn } from "../components/PopulationToggleBtn";
import { MainLayout } from "../wrappers/mainWrapper";
import { LegendTable } from "../components/molicules";
import { getRouteFromGraphScreen, mapCall } from "../utils/commonFunction";
import { apiMethod } from "../api";


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

export const PopulationScreen = () => {
  const dispatch = useDispatch();
  const { map } = useMap();
  const location = useLocation();
  const navigate = useNavigate();


  //Reducer
  const isRightPanelOpen = useSelector(
    (state: AppState) => state.app.isRightPanelOpen,
  );

  // State
  const [activeYearBtn, setActiveYearBtn] = useState<2020 | 2025>(2020);
  const [viewMode, setViewMode] = useState<"zone" | "block">("zone");

  // Drill-down State
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  // Filters
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState<string[]>(
    [],
  );
  const [selectedEducation, setSelectedEducation] = useState<string[]>([]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>(
    [],
  );

  // Data State
  const [fullApiData, setFullApiData] = useState<any>(null);
  const [populationMap, setPopulationMap] = useState<Map<
    number,
    number
  > | null>(null);
  const [blockPeopleMap, setBlockPeopleMap] = useState<Map<
    number,
    number
  > | null>(null);
  const [panelData, setPanelData] = useState<any>(null);
  const [blockData, setBlockData] = useState<any[] | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Chat Data State
  const [chatInfo, setChatInfo] = useState<{
    text: string;
    recommendations: string[];
    question?: string;
  } | null>(null);

  const zoneData = useSelector((state: AppState) => state.app.zoneData);
  const fullGeoJsonRef = useRef<FeatureCollection | null>(null);
  const hoveredZoneId = useRef<number | null>(null);

  const isActive = useRef(true);
  const hasAnimated = useRef(false);
  const hasTransitionedYear = useRef(false);
  const isTransitioning = useRef(false);

  // Track the last used query data object reference to prevent re-processing same data
  const lastQueryDataRef = useRef<any>(null);

  const [apiRange, setApiRange] = useState<any[] | null>(null);

  // --- Initial Loading Check ---
  useEffect(() => {
    if (!zoneData) {
      dispatch(setLoading(true, "Loading Map Data..."));
    }
  }, [zoneData, dispatch]);

  // --- Handlers ---
  const stopCinematicMode = () => {
    isActive.current = false;
    if (map) map.stop();
  };

  const handleAgeGroupToggle = (groupName: string) => {
    const cleanName = groupName.replace("\n", " ");
    setSelectedAgeGroups((prev) => {
      if (prev.includes(cleanName)) {
        return prev.filter((g) => g !== cleanName);
      } else {
        return [...prev, cleanName];
      }
    });
  };

  const handleGenderToggle = (gender: string) => {
    setSelectedGender((prev) => (prev === gender ? null : gender));
  };

  const handleMaritalStatusToggle = (status: string) => {
    setSelectedMaritalStatus((prev) => {
      if (prev.includes(status)) return prev.filter((s) => s !== status);
      return [...prev, status];
    });
  };

  const handleEducationToggle = (edu: string) => {
    setSelectedEducation((prev) => {
      if (prev.includes(edu)) return prev.filter((e) => e !== edu);
      return [...prev, edu];
    });
  };

  const handleNationalityToggle = (nat: string) => {
    setSelectedNationalities((prev) => {
      if (prev.includes(nat)) return prev.filter((n) => n !== nat);
      return [...prev, nat];
    });
  };

  const handleResetFilters = () => {
    setSelectedAgeGroups([]);
    setSelectedGender(null);
    setSelectedMaritalStatus([]);
    setSelectedEducation([]);
    setSelectedNationalities([]);
    setSelectedZone(null); // Reset Zone
    if (map) {
      map.flyTo({
        center: [51.5348, 25.2867],
        zoom: 10,
        duration: 1500,
      });
    }
  };

  // --- Logic for updating data from Query API (Same Screen) ---

  const applyFilters = (filters: any) => {
    if (!filters) return;

    if (Array.isArray(filters.gender) && filters.gender.length > 0) {
      setSelectedGender(filters.gender);
    }

    if (Array.isArray(filters.maritalStatus) && filters.maritalStatus.length > 0) {
      setSelectedMaritalStatus(filters.maritalStatus);
    }

    if (Array.isArray(filters.nationality) && filters.nationality.length > 0) {
      setSelectedNationalities(filters.nationality);
    }

    // educationLevel
    if (Array.isArray(filters.educationLevel) && filters.educationLevel.length > 0) {
      setSelectedEducation(filters.educationLevel);
    }

    if (Array.isArray(filters.age) && filters.age.length > 0) {

      const getAgeLabel = (from: number, to: number) => {
        if (from >= 0 && to <= 14) return `Children (${from}-${to})`;
        if (from >= 15 && to <= 29) return `Youth (${from}-${to})`;
        if (from >= 20 && to <= 59) return `Working (${from}-${to})`;
        if (from >= 60) return `Elderly (${from}+)`;
        return `${from}-${to}`;
      };

      let ageGroups: string[] = [];

      // Case 1: [15, 1000]
      if (typeof filters.age[0] === "number") {
        const [from, to] = filters.age;
        ageGroups = [getAgeLabel(from, to)];
      }

      // Case 2: [{ from: 15, to: 29 }]
      else {
        ageGroups = filters.age.map(({ from, to }: any) =>
          getAgeLabel(from, to)
        );
      }

      setSelectedAgeGroups(ageGroups);
    }

  };

  const handleDataUpdate = (stateData: any) => {
    const filters = stateData?.queryData?.filters;

    if (filters) {
      applyFilters(filters);
    }
    const data = stateData.queryData;
    if (data && data !== lastQueryDataRef.current) {
      setFullApiData(data);
      if (data.range) {
        // CHANGED: Store the full array
        setApiRange(data.range);
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
          let route = getRouteFromGraphScreen(data.graphScreeen);
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

            if (route === "/population") {
              handleDataUpdate(navigationState);
            } else {
              if (map) {
                mapCall(map, navigate, route, navigationState);
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

  const performZoomTransition = (onComplete: () => void) => {
    if (!map || isTransitioning.current) return;
    isTransitioning.current = true;
    stopCinematicMode();
    map.flyTo({
      zoom: ZOOM_OUT_VAL,
      duration: 3000,
      essential: true,
    });
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
    isActive.current = true;
    if (map) {
      const events = [
        "mousedown",
        "touchstart",
        "wheel",
        "dragstart",
        "contextmenu",
      ];
      const stop = () => {
        if (isActive.current) stopCinematicMode();
      };
      events.forEach((evt) => map.on(evt, stop));
      return () => events.forEach((evt) => map.off(evt, stop));
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

  // --- API Call & Data Processing ---
  useEffect(() => {
    const loadApiData = async () => {

      const isDefaultFilters =
        selectedAgeGroups.length === 0 &&
        selectedGender === null &&
        selectedMaritalStatus.length === 0 &&
        selectedEducation.length === 0 &&
        selectedNationalities.length === 0 &&
        selectedZone === null;

      if (location.state?.queryData && isDefaultFilters) {
        handleDataUpdate(location.state);
        dispatch(setLoading(false));
        return;
      }

      try {
        dispatch(setLoading(true, "Fetching Population Analysis..."));
        const requestYears = [2020, 2025];
        const body: any = { year: requestYears };
        if (selectedAgeGroups.length > 0) {
          body.ageGroup = selectedAgeGroups.map((uiLabel) => {
            const match = uiLabel.match(/\(([^)]+)\)/);
            return match ? match[1] : uiLabel;
          });
        }
        if (selectedGender) {
          body.gender = [selectedGender];
        }
        if (selectedNationalities.length > 0) {
          body.nationality = selectedNationalities;
        } else if (selectedGender) {
          body.nationality = ["Qatari", "Non-Qatari"];
        }
        if (selectedMaritalStatus.length > 0) {
          body.maritalStatus = selectedMaritalStatus;
        }
        if (selectedEducation.length > 0) {
          body.education = selectedEducation;
        }
        // Updated Zone ID
        if (selectedZone !== null) {
          body.zoneId = [selectedZone];
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/population`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = await response.json();
        const data = json.data;
        if (data) setFullApiData(data);
        if (data.range) {
          // CHANGED: Store the full array
          setApiRange(data.range);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => dispatch(setLoading(false)), 500);
      }
    };
    loadApiData();
  }, [
    selectedAgeGroups,
    selectedGender,
    selectedMaritalStatus,
    selectedEducation,
    selectedNationalities,
    selectedZone, // Refetch on zone click
    dispatch,
    location.state,
  ]);

  useEffect(() => {
    if (!fullApiData) return;

    const yearForMap = activeYearBtn;

    const getYearData = (arr: any[], year: number) =>
      arr.filter((item: any) => Number(item.year) === year);

    const nationalityCurrent = getYearData(
      fullApiData.nationalityWisePopulation || [],
      2025
    );

    const nationalityCompare = getYearData(
      fullApiData.nationalityWisePopulation || [],
      2020
    );

    const zMap = new Map<number, number>();
    (fullApiData.zoneWisePopulation || [])
      .filter((item: any) => Number(item.year) === yearForMap)
      .forEach((item: any) =>
        zMap.set(Number(item.zoneNumber), Number(item.totalPopulation)),
      );
    setPopulationMap(zMap);
    const bMap = new Map<number, number>();
    (fullApiData.blockWisePopulation || [])
      .filter((item: any) => Number(item.year) === yearForMap)
      .forEach((item: any) =>
        bMap.set(Number(item.blockNumber), Number(item.totalPopulation)),
      );
    setBlockPeopleMap(bMap);
    const currentData = {
      education: getYearData(fullApiData.distributionByEducation || [], 2025),
      marital: getYearData(
        fullApiData.distributionByMaritalStatusAndGender || [],
        2025
      ),
      pyramid: getYearData(fullApiData.populationPyramid || [], 2025),
      nationality: nationalityCurrent
    };
    const compareData = {
      education: getYearData(fullApiData.distributionByEducation || [], 2020),
      marital: getYearData(
        fullApiData.distributionByMaritalStatusAndGender || [],
        2020
      ),
      pyramid: getYearData(fullApiData.populationPyramid || [], 2020),
      nationality: nationalityCompare
    };
    setPanelData({
      current: formatPanelData(currentData),
      comparison: formatPanelData(compareData),
    });
    setIsDataLoaded(true);
  }, [fullApiData, activeYearBtn]);

  const formatPanelData = (rawData: any) => {
    const maritalMap: any = {};
    rawData.marital.forEach((item: any) => {
      if (!maritalMap[item.status])
        maritalMap[item.status] = {
          name: item.status,
          maleVal: 0,
          femaleVal: 0,
        };
      if (item.gender === "Male")
        maritalMap[item.status].maleVal += item.totalPopulation;
      else maritalMap[item.status].femaleVal += item.totalPopulation;
    });
    const eduMap: any = {};
    rawData.education.forEach((item: any) => {
      const rawName = item.educationLevel;
      const displayName = item.educationLevel
        .replace("Read and Write", "Read and Write")
        .replace("Post-Secondary", "Secondary & Post")
        .replace("University", "University & Above");
      if (!eduMap[displayName])
        eduMap[displayName] = {
          name: displayName,
          rawName: rawName,
          Male: 0,
          Female: 0,
        };
      if (item.gender === "Male")
        eduMap[displayName].Male += item.totalPopulation;
      else eduMap[displayName].Female += item.totalPopulation;
    });
    const pyramid = rawData.pyramid.map((item: any) => ({
      name: item.ageGroup,
      mq: item.maleQatari,
      mnq: item.maleNonQatari,
      fq: item.femaleQatari,
      fnq: item.femaleNonQatari,
    }));
    return {
      marital: Object.values(maritalMap),
      education: Object.values(eduMap),
      pyramid: pyramid,
      nationality: rawData.nationality || []
    };
  };

  // --- Map Layer Updates ---
  useEffect(() => {
    if (!map) return;
    if (!zoneData) return;

    const mapInstance = map.getMap();

    if (mapInstance.getLayer("population-zone-border"))
      mapInstance.removeLayer("population-zone-border");
    if (mapInstance.getSource("population-zone-border-source"))
      mapInstance.removeSource("population-zone-border-source");

    let features: Feature[] = [];
    let layerConfig: FillLayer;

    // --- Dynamic Color Stops ---
    let minRange = 0;
    let maxRange = 100000;

    // CHANGED: Find correct range based on activeYearBtn
    if (apiRange && Array.isArray(apiRange)) {
      const currentYearRange = apiRange.find(
        (r: any) => r.year === activeYearBtn,
      );

      if (currentYearRange) {
        if (viewMode === "zone" && selectedZone === null) {
          minRange = currentYearRange.minZoneRange || 0;
          maxRange = currentYearRange.maxZoneRange || 100000;
        } else {
          // Blocks (either in block view or drill-down)
          minRange = currentYearRange.minBlockRange || 0;
          maxRange = currentYearRange.maxBlockRange || 100000;
        }
      }
    }

    // Gradient Colors matching Footer
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
        if (val <= 0) val = 1; // Ensure 0 is reserved for transparent
        colorStops.push(val, color);
      });
    } else {
      // Fallback if flat
      colorStops.push(1, colors[0]);
    }

    if (selectedZone !== null) {
      if (!blockData || !blockPeopleMap || !zoneData) return;
      features = blockData
        .map((row: any, index: number) => {
          try {
            if (Number(row.zone_number) !== selectedZone) return null;
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = blockPeopleMap.get(blockNum) || 0;
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
        id: "population-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            ["interpolate", ["linear"], ["get", "count"], ...colorStops],
          ],
          "fill-opacity": 0.9,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "population-source",
      };

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
        mapInstance.addSource("population-zone-border-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [borderFeature] },
        });
        mapInstance.addLayer({
          id: "population-zone-border",
          type: "line",
          source: "population-zone-border-source",
          paint: {
            "line-color": "#FFD700",
            "line-width": 3,
            "line-opacity": 1,
          },
        });
      }
    } else if (viewMode === "zone") {
      if (!zoneData || !populationMap) return;
      features = zoneData
        .map((row: any) => {
          try {
            if (row.z_geojson_4326) {
              const geometry = JSON.parse(row.z_geojson_4326);
              const id = Number(row.zone_number);
              const count = populationMap.get(id) || 0;
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
        id: "population-layer",
        type: "fill",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            HOVER_COLOR,
            ["interpolate", ["linear"], ["get", "count"], ...colorStops],
          ],
          "fill-opacity": 0.9,
          "fill-outline-color": "rgba(255,255,255,0.05)",
        },
        source: "population-source",
      };
    } else {
      if (!blockData || !blockPeopleMap) return;
      features = blockData
        .map((row: any, index: number) => {
          try {
            if (row.b_geojson_4326) {
              const geometry = JSON.parse(row.b_geojson_4326);
              const id = Number(row.block_objectid) || index;
              const blockNum = Number(row.block_number);
              const count = blockPeopleMap.get(blockNum) || 0;
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
        id: "population-layer",
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
        source: "population-source",
      };
    }

    if (features.length === 0) return;
    const geoJson: FeatureCollection = { type: "FeatureCollection", features };
    fullGeoJsonRef.current = geoJson;

    const blockLineLayer: LineLayer = {
      id: "pop-block-line-layer",
      type: "line",
      paint: {
        "line-color": BLOCK_LAYER_COLOR,
        "line-width": 1,
        "line-opacity": 0.5,
      },
      source: "population-source",
    };

    const layers =
      viewMode === "block" ? [layerConfig, blockLineLayer] : layerConfig;

    dispatch(setMapLayer("population-source", geoJson, layers as any));
    dispatch(setLoading(false));
  }, [
    viewMode,
    selectedZone,
    zoneData,
    blockData,
    populationMap,
    blockPeopleMap,
    dispatch,
    map,
    apiRange, // Added dependency
    activeYearBtn, // Added dependency to trigger update on year switch
  ]);

  // --- Interaction (Hover & Click) ---
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    const onMouseMove = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["population-layer"],
      });

      if (features.length > 0) {
        mapInstance.getCanvas().style.cursor = "pointer";
        const featureId = features[0].id;

        if (hoveredZoneId.current !== featureId) {
          if (hoveredZoneId.current !== null) {
            mapInstance.setFeatureState(
              { source: "population-source", id: hoveredZoneId.current },
              { hover: false },
            );
          }
          hoveredZoneId.current = featureId as number;
          mapInstance.setFeatureState(
            // @ts-ignore
            { source: "population-source", id: featureId },
            { hover: true },
          );
        }
      } else {
        mapInstance.getCanvas().style.cursor = "";
        if (hoveredZoneId.current !== null) {
          mapInstance.setFeatureState(
            { source: "population-source", id: hoveredZoneId.current },
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
          { source: "population-source", id: hoveredZoneId.current },
          { hover: false },
        );
        hoveredZoneId.current = null;
      }
    };

    // --- CLICK LISTENER ---
    const onClick = (e: any) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["population-layer"],
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

    mapInstance.on("mousemove", "population-layer", onMouseMove);
    mapInstance.on("mouseleave", "population-layer", onMouseLeave);
    mapInstance.on("click", onClick);

    return () => {
      mapInstance.off("mousemove", "population-layer", onMouseMove);
      mapInstance.off("mouseleave", "population-layer", onMouseLeave);
      mapInstance.off("click", onClick);
    };
  }, [map]);

  let minVal = 0,
    maxVal = 100000;
  if (apiRange && Array.isArray(apiRange)) {
    // CHANGED: Find correct range for footer
    const currentYearRange = apiRange.find(
      (r: any) => r.year === activeYearBtn,
    );
    if (currentYearRange) {
      if (viewMode === "zone") {
        minVal = currentYearRange.minZoneRange;
        maxVal = currentYearRange.maxZoneRange;
      } else {
        minVal = currentYearRange.minBlockRange;
        maxVal = currentYearRange.maxBlockRange;
      }
    }
  }

  //
  const handleTransition = (path: string) => {
    if (stopCinematicMode) stopCinematicMode();
    if (map) {
      map.stop();
      map.flyTo({ center: [51.5348, 25.2867], zoom: 9, duration: 2000 });
      map.once("moveend", () => navigate(path));
    } else {
      navigate(path);
    }
  };
  const processTextAndNavigate = () => handleTransition("/establishment");


  const RaviChatText = chatInfo?.text || "Good morning. Qatar’s population is 3.7M (+4% vs 2020). 28.02% are university educated.";
  const RaviChatQuestion = chatInfo?.question || "Population analysis by block in Doha";

  return (
    <MainLayout
      leftSideRaviChatData={{
        text: RaviChatText,
        question: RaviChatQuestion,
        recommendations: chatInfo?.recommendations,
        buttonText: "Show Employment",
        onButtonClick: () => processTextAndNavigate(),
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
        title: selectedZone ? `Population (Zone ${selectedZone} Blocks)` : viewMode === "zone" ? "Population Distribution (Zone)" : "Population Distribution (Block)",
        minVal: minVal,
        maxVal: maxVal
      }}

      onReset={handleResetFilters}

      filterTagsSet={
        [{ item: selectedAgeGroups, toggle: handleAgeGroupToggle },
        { item: selectedNationalities, toggle: handleNationalityToggle },
        { item: selectedMaritalStatus, toggle: handleMaritalStatusToggle },
        { item: selectedEducation, toggle: handleEducationToggle }]
      }
    >

      <div style={{
        display: "flex",
        gap: 5,
        justifyContent: isRightPanelOpen ? "space-between" : "flex-end",
        height: "100%"
      }}>

        {panelData && isRightPanelOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%" }}>
            <div style={{
              height: "90%",
              zIndex: 100,
              overflowY: "auto",
              scrollbarWidth: "none",
              pointerEvents: "auto",
            }}>

              <RightPanel
                data={panelData}
                onStartTransition={stopCinematicMode}
                selectedAgeGroups={selectedAgeGroups}
                onAgeGroupToggle={handleAgeGroupToggle}
                selectedGender={selectedGender}
                onGenderToggle={handleGenderToggle}
                selectedMaritalStatus={selectedMaritalStatus}
                onMaritalStatusToggle={handleMaritalStatusToggle}
                selectedEducation={selectedEducation}
                onEducationToggle={handleEducationToggle}
                selectedNationalities={selectedNationalities}
                onNationalityToggle={handleNationalityToggle}
                onResetFilters={handleResetFilters}
                chatData={chatInfo}
                onRecommendationClick={handleRecommendationClick}
                onDataUpdate={handleDataUpdate}
              />
            </div>
            <LegendTable
              type="simple"
              selectedGender={selectedGender}
              onGenderToggle={handleGenderToggle}
              data={panelData}
            />
          </div>
        )}
      </div>

    </MainLayout>
  );
};
