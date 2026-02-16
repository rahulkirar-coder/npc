import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DisabilityRightPanel } from "../components/DisabilityRightPanel";
import { Footer } from "../components/Footer"; // Import Footer
import { setLoading, setMapLayer, type AppState } from "../state/appReducer";
import { useMap } from "react-map-gl";
import type { FillLayer } from "react-map-gl";
import type { FeatureCollection, Feature } from "geojson";

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

const INTERACTIVE_STYLE: React.CSSProperties = {
  pointerEvents: "auto",
};

export const DisabilityScreen = () => {
  const dispatch = useDispatch();
  const { map } = useMap();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [panelData, setPanelData] = useState<any>(null);
  const [disabilityMap, setDisabilityMap] = useState<Map<
    number,
    number
  > | null>(null);
  const [dataRange, setDataRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 0,
  });

  // Access global zone data from Redux
  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  const isActive = useRef(true);
  const hasAnimated = useRef(false);

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
    if (map && isDataLoaded && !hasAnimated.current) {
      hasAnimated.current = true;
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
        bearing: currentBearing - 5,
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
      bearing: 0,
      pitch: 55,
      zoom: 10.5,
      duration: 2500,
      essential: true,
    });

    map.once("moveend", () => {
      requestAnimationFrame(() => {
        if (isActive.current) rotate();
      });
    });
  };

  const loadData = async () => {
    if (!zoneData || zoneData.length === 0) return;

    try {
      dispatch(setLoading(true, "Disability Distribution..."));

      const response = await fetch(
        "https://poc-backend-wheat.vercel.app/disability/zone"
      );
      if (!response.ok) throw new Error("API Error");
      const json = await response.json();
      const data = json.data;

      // 1. Process Map Data (Zone Totals)
      const dMap = new Map<number, number>();
      let minVal = Infinity;
      let maxVal = -Infinity;

      if (data.zoneWise && Array.isArray(data.zoneWise)) {
        data.zoneWise.forEach((item: any) => {
          const val = Number(item.total);
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
          dMap.set(Number(item.zone), val);
        });
      }
      setDisabilityMap(dMap);
      setDataRange({
        min: minVal === Infinity ? 0 : minVal,
        max: maxVal === -Infinity ? 0 : maxVal,
      });

      // 2. Prepare Panel Data
      setPanelData({
        disabilityBySex: data.disabilityBySex,
        severityLevels: data.severityLevels,
      });
    } catch (e) {
      console.error("Error loading disability data:", e);
    } finally {
      setTimeout(() => dispatch(setLoading(false)), 500);
    }
  };

  useEffect(() => {
    if (zoneData && zoneData.length > 0 && !panelData) {
      loadData();
    }
  }, [zoneData]);

  // Update Map Layer
  useEffect(() => {
    if (!zoneData || !disabilityMap) return;

    const features: Feature[] = zoneData
      .map((row: any, index: number) => {
        try {
          if (row.z_geojson_4326) {
            const geometry = JSON.parse(row.z_geojson_4326);
            const zoneId = Number(row.zone_number);
            const count = disabilityMap.get(zoneId) || 0;

            if (count === 0) return null;

            return {
              id: index,
              type: "Feature",
              geometry: geometry,
              properties: {
                ...row,
                count: count,
              },
            } as Feature;
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((f) => f !== null) as Feature[];

    const geoJson: FeatureCollection = { type: "FeatureCollection", features };

    const layerConfig: FillLayer = {
      id: "disability-polygon-layer",
      type: "fill",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "count"],
          0,
          "#1a6b62",
          10000,
          "#22937f",
          30000,
          "#2cb9a0",
          50000,
          "#5dd4b8",
          80000,
          "#d4a437",
          120000,
          "#e8a945",
          160000,
          "#f97316",
          200000,
          "#8b1538",
        ],
        "fill-opacity": 0.8,
        "fill-outline-color": "rgba(255,255,255,0.1)",
      },
      source: "disability-data",
    };

    dispatch(setMapLayer("disability-data", geoJson, layerConfig as any));
    setIsDataLoaded(true);
  }, [zoneData, disabilityMap, dispatch]);

  return (
    <div style={SCREEN_STYLE}>
      <div style={UI_CONTAINER_STYLE}>
        <div style={INTERACTIVE_STYLE}>
          {panelData && (
            <DisabilityRightPanel
              data={panelData}
              onStartTransition={stopCinematicMode}
            />
          )}
        </div>

        {/* Updated Footer */}
        <div style={FOOTER_WRAPPER_STYLE}>
          <div style={FOOTER_POINTER_STYLE}>
            <Footer
              title="Disability Intensity (Count)"
              minVal={dataRange.min}
              maxVal={dataRange.max}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
