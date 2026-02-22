import React, { useEffect, useRef } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  type MapRef,
} from "react-map-gl";
import { useSelector, useDispatch } from "react-redux";
import {
  type AppState,
  updateViewState,
  setZoneData,
} from "../state/appReducer";
import { parseCSV, YELLOW_LAYER_COLOR } from "../util";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, FeatureCollection } from "geojson";

const GRAPH_AREA_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const GraphArea = () => {
  const dispatch = useDispatch();
  const mapRef = useRef<MapRef>(null);

  const { viewState, activeLayerId, geoJsonData, layerConfig } = useSelector(
    (state: AppState) => state.app.map
  );

  const zoneData = useSelector((state: AppState) => state.app.zoneData);

  // --- 1. Load Zone CSV Globally Once ---
  useEffect(() => {
    if (zoneData) return; // Already loaded

    const fetchZones = async () => {
      try {
        const response = await fetch("/zone.csv");
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        dispatch(setZoneData(rows));
      } catch (e) {
        console.error("Error loading global zone data:", e);
      }
    };
    fetchZones();
  }, [zoneData, dispatch]);

  // --- 2. Add Persistent Zone Source & Layer ---
  useEffect(() => {
    if (!zoneData || !mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const addGlobalLayers = () => {
      if (map.getSource("global-zone-source")) return;

      // Convert to GeoJSON
      const features: Feature[] = zoneData
        .map((row: any, index: number) => {
          try {
            if (row.z_geojson_4326) {
              return {
                id: index,
                type: "Feature",
                geometry: JSON.parse(row.z_geojson_4326),
                properties: { ...row },
              } as Feature;
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Feature[];

      const geoJson: FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      map.addSource("global-zone-source", {
        type: "geojson",
        data: geoJson,
      });

      // Global Yellow Border Layer
      if (!map.getLayer("global-zone-borders")) {
        map.addLayer({
          id: "global-zone-borders",
          type: "line",
          source: "global-zone-source",
          paint: {
            "line-color": YELLOW_LAYER_COLOR, // Bright Yellow
            "line-width": 1, // Increased Width
            "line-opacity": 0.8,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      addGlobalLayers();
    } else {
      map.on("load", addGlobalLayers);
    }
  }, [zoneData]);

  // --- 3. Ensure Global Borders Stay on Top ---
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    if (map && map.getLayer("global-zone-borders")) {
      setTimeout(() => {
        if (map.getLayer("global-zone-borders")) {
          map.moveLayer("global-zone-borders");
        }
      }, 100);
    }
  }, [activeLayerId]);

  return (
    <div style={GRAPH_AREA_STYLE}>
      <Map
        {...viewState}
        ref={mapRef}
        id="map"
        onMove={(evt) => dispatch(updateViewState(evt.viewState))}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
      >
        <NavigationControl position="bottom-right" />

        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        {/* UPDATED: Handle Array of Layers */}
        {activeLayerId && geoJsonData && layerConfig && (
          <Source
            key={activeLayerId}
            id={activeLayerId}
            type="geojson"
            data={geoJsonData}
          >
            {Array.isArray(layerConfig) ? (
              layerConfig.map((conf: any) => <Layer key={conf.id} {...conf} />)
            ) : (
              <Layer {...layerConfig} />
            )}
          </Source>
        )}
      </Map>
    </div>
  );
};