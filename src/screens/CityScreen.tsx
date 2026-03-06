import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMapLayer, type AppState, setLoading } from "../state/appReducer";
import { useMap } from "react-map-gl";
import type { LineLayer, FillExtrusionLayer } from "mapbox-gl";
import type { FeatureCollection, Feature } from "geojson";
import { useNavigate } from "react-router-dom";
import { BottomInputPanel } from "../components/AIChat";
import { YELLOW_LAYER_COLOR, parseRobustCSV, getMaxZFromWkt } from "../util";
import { Header } from "../components/Header";
import { LoadingOverlay } from "../components/LoadingOverlay";

// --- Styles ---
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

// Helper to get max dimension (width or length) of a polygon in degrees
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

export const CityScreen = () => {
  const dispatch = useDispatch();
  const { map } = useMap();
  const navigate = useNavigate();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Track if the API fetch has completed (success or fail)
  const [areBuildingsFetched, setAreBuildingsFetched] = useState(false);

  const isActive = useRef(true);

  // Redux State
  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  // Local Data State
  const [buildingFeatures, setBuildingFeatures] = useState<Feature[]>([]);

  // --- 1. Initial Loading State ---
  useEffect(() => {
    // Trigger loading immediately on mount to prevent flashing
    dispatch(setLoading(true, "Loading City Resources..."));
    return () => {
      // Cleanup
    };
  }, [dispatch]);

  // --- Animation Logic ---
  const stopCinematicMode = () => {
    isActive.current = false;
    if (map) map.stop();
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
    if (map && isDataLoaded) {
      setTimeout(() => {
        if (isActive.current) startCinematicAnimation();
      }, 100);
    }
  }, [map, isDataLoaded]);

  const startCinematicAnimation = () => {
    if (!map) return;
    isActive.current = true;

    const rotate = () => {
      if (!isActive.current) return;
      const currentBearing = map.getBearing();
      map.easeTo({
        bearing: currentBearing + 3,
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
      center: [51.52, 25.28],
      bearing: -15,
      pitch: 80,
      zoom: 14,
      duration: 2500,
      essential: true,
    });

    map.once("moveend", () => {
      requestAnimationFrame(() => {
        if (isActive.current) rotate();
      });
    });
  };

  // --- Load & Process Buildings from API ---
  useEffect(() => {
    const fetchBuildings = async () => {
      // Ensure loading is showing while we fetch
      dispatch(setLoading(true, "Fetching 3D Buildings..."));

      try {
        const response = await fetch(
          "https://rawi-backend.vercel.app/building/doha",
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!response.ok) throw new Error("Failed to fetch buildings");
        const json = await response.json();

        if (json.data && Array.isArray(json.data.dohaBuildings)) {
          const features: Feature[] = json.data.dohaBuildings
            .map((b: any, index: number) => {
              if (!b.shape) return null;

              // Parse Geometry & Height directly from WKT string
              const parsed = parseBuildingGeometry(b.shape);
              if (!parsed) return null;

              const { coordinates, height } = parsed;

              // Check Width (Max Dimension)
              const maxDim = getPolygonMaxDimension(coordinates);
              if (maxDim > 0.0008) return null;

              return {
                id: `b-${index}`,
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: coordinates,
                },
                properties: {
                  ...b,
                  height: height, // Use actual height from API
                  type: "building", // Ensure type is set for styling
                },
              } as Feature;
            })
            .filter((f: any) => f !== null) as Feature[];

          setBuildingFeatures(features);
        } else {
          setBuildingFeatures([]);
        }
      } catch (e) {
        console.error("Error loading building API:", e);
        setBuildingFeatures([]);
      } finally {
        // Mark fetch as done so the next effect can proceed
        setAreBuildingsFetched(true);
      }
    };

    fetchBuildings();
  }, [dispatch]);

  // --- Combine Data & Update Map Layers ---
  useEffect(() => {
    // Wait for both Zone Data AND Buildings Fetch to complete
    if (!zoneData || !areBuildingsFetched) return;

    const loadData = async () => {
      try {
        dispatch(setLoading(true, "Constructing City 3D Model..."));

        // 1. Zone Borders (Context)
        const zoneFeatures: Feature[] = zoneData
          .map((row: any, index: number) => {
            try {
              if (row.z_geojson_4326) {
                const geometry = JSON.parse(row.z_geojson_4326);
                return {
                  id: `z-${index}`,
                  type: "Feature",
                  geometry: geometry,
                  properties: { ...row, type: "zone" },
                } as Feature;
              }
              return null;
            } catch {
              return null;
            }
          })
          .filter((f) => f !== null) as Feature[];

        // 2. Combine Data
        const combinedFeatures = [...zoneFeatures, ...buildingFeatures];

        const geoJson: FeatureCollection = {
          type: "FeatureCollection",
          features: combinedFeatures,
        };

        // 3. Layer Configuration

        // Layer A: Zone Borders (Yellow Lines)
        const borderLayerConfig: LineLayer = {
          id: "city-border-layer",
          type: "line",
          filter: ["==", "type", "zone"],
          paint: {
            "line-color": YELLOW_LAYER_COLOR,
            "line-width": 1.5,
            "line-opacity": 0.6,
          },
          source: "city-data",
        };

        // Layer B: 3D Buildings (Fill Extrusion)
        const buildingLayerConfig: FillExtrusionLayer = {
          id: "city-building-layer",
          type: "fill-extrusion",
          filter: ["==", "type", "building"],
          paint: {
            // Color gradient based on height: Light Gray -> Blueish Gray
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "height"],
              30, "#F8E6E6",  // very light maroon (low rise)
              100, "#C97C7C",  // medium
              250, "#7B1E1E",  // deep maroon (tall towers)
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.95, // Solid look
            "fill-extrusion-vertical-gradient": true, // Adds shading
          },
          source: "city-data",
        };

        dispatch(
          setMapLayer(
            "city-data",
            geoJson,
            [borderLayerConfig as any, buildingLayerConfig as any],
            {
              pitch: 60,
              zoom: 12.5,
              bearing: -15,
            },
          ),
        );
        setIsDataLoaded(true);
      } catch (e) {
        console.error("Error loading city data:", e);
      } finally {
        setTimeout(() => dispatch(setLoading(false)), 500);
      }
    };

    loadData();
  }, [zoneData, buildingFeatures, areBuildingsFetched, dispatch]);

  // --- Navigation ---
  const handleTransition = (targetRoute: string) => {
    if (map) {
      stopCinematicMode();
      map.flyTo({
        center: [51.5348, 25.2867],
        zoom: 9,
        pitch: 0,
        bearing: 0,
        duration: 2000,
        essential: true,
      });
      map.once("moveend", () => navigate(targetRoute));
    } else {
      navigate(targetRoute);
    }
  };

  const processTextAndNavigate = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    if (!lowerText) return;

    if (lowerText.includes("establishment")) handleTransition("/establishment");
    else if (lowerText.includes("building")) handleTransition("/building");
    else if (lowerText.includes("population")) handleTransition("/population");
    else if (lowerText.includes("employment")) handleTransition("/employment");
    else handleTransition("/population");
  };

  const COMMON_CHIPS = [
    // "Population analysis by block in Doha",
    // "Analyze establishment distribution",
    // "Building distribution by type and status",
    // "Compare population between Doha and Al Daayen",
  ];

  return (
    <div style={SCREEN_STYLE}>
      <LoadingOverlay/>
      <div style={UI_CONTAINER_STYLE}>
        <BottomInputPanel
          chips={COMMON_CHIPS}
          onSubmit={processTextAndNavigate}
        />
      </div>
    </div>
  );
};
