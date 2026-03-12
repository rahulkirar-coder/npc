import { latLngToCell, cellToBoundary } from "h3-js";
import type { FeatureCollection, Feature, Polygon, Point } from "geojson";

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://rawibackend.vercel.app";

// Helper: Convert H3 index to GeoJSON Polygon
const getHexPolygon = (h3Index: string): number[][] => {
  const boundary = cellToBoundary(h3Index);
  const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
  coordinates.push(coordinates[0]); // Close ring
  return coordinates;
};

// 1. Process Raw Population Data -> GeoJSON Polygons (Hexbins)
export const aggregateToHexGeoJson = (
  data: any[],
  resolution = 7,
): FeatureCollection<Polygon> => {
  const hexMap = new Map<string, number>();

  for (const d of data) {
    const lat = Number(d.latitude || d.lat || d[0]);
    const lng = Number(d.longitude || d.lng || d[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const h3 = latLngToCell(lat, lng, resolution);
    hexMap.set(h3, (hexMap.get(h3) || 0) + 1);
  }

  const features: Feature<Polygon>[] = [];

  for (const [h3, count] of hexMap.entries()) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [getHexPolygon(h3)],
      },
      properties: {
        count,
        h3,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
};

// 2. Process Points -> GeoJSON Points
export const pointsToGeoJson = (
  data: any[],
  getProps: (row: any) => any,
): FeatureCollection<Point> => {
  const features: Feature<Point>[] = data
    .map((row) => {
      const isArray = Array.isArray(row);
      const lat = isArray ? row[0] : row.latitude;
      const lng = isArray ? row[1] : row.longitude;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        properties: getProps(row),
      };
    })
    .filter(Boolean) as Feature<Point>[];

  return {
    type: "FeatureCollection",
    features,
  };
};

// 3. Robust CSV Parser
export const parseCSV = (text: string) => {
  const result: any[] = [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let currentVal = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(currentVal);
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal);

    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      result.push(row);
    }
  }
  return result;
};

// --- Robust CSV Parser (Handles newlines in quotes) ---
export const parseRobustCSV = (text: string) => {
  const rows: any[] = [];
  let headers: string[] = [];
  let currentVal = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentVal);
        currentVal = "";
      } else if (char === "\n" || char === "\r") {
        if (currentVal || currentRow.length > 0) {
          currentRow.push(currentVal);
          if (headers.length === 0) {
            headers = currentRow.map((h) => h.trim());
          } else {
            if (currentRow.length === headers.length) {
              const rowObj: any = {};
              headers.forEach((h, idx) => (rowObj[h] = currentRow[idx]));
              rows.push(rowObj);
            }
          }
          currentRow = [];
          currentVal = "";
          if (char === "\r" && nextChar === "\n") i++;
        }
      } else {
        currentVal += char;
      }
    }
  }
  // Flush last row
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.length === headers.length) {
      const rowObj: any = {};
      headers.forEach((h, idx) => (rowObj[h] = currentRow[idx]));
      rows.push(rowObj);
    }
  }
  return rows;
};

/**
 * Parses a WKT string (including SRID) and returns the maximum Z coordinate.
 * Works for POINT Z, POLYGON Z, and MULTIPOLYGON Z.
 */
export const getMaxZFromWkt = (wktStr: string | null): number | null => {
  if (!wktStr) return null;

  try {
    // 1. Remove SRID prefix if it exists (e.g., "SRID=4326;")
    const cleanWkt = wktStr.includes(";") ? wktStr.split(";")[1] : wktStr;

    // 2. Regular expression to find all numerical triplets (X Y Z)
    // This matches patterns like: 51.599 25.171 12.554
    const coordinateRegex = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g;

    const zValues: number[] = [];
    let match;

    while ((match = coordinateRegex.exec(cleanWkt)) !== null) {
      // match[3] is the third group in the regex: the Z coordinate
      const z = parseFloat(match[3]);
      if (!isNaN(z)) {
        zValues.push(z);
      }
    }

    if (zValues.length === 0) {
      return null;
    }

    return Math.max(...zValues);
  } catch (error) {
    console.error("Error parsing WKT Z coordinate:", error);
    return null;
  }
};

export const YELLOW_LAYER_COLOR = "#E0C88F";
export const BLOCK_LAYER_COLOR = "#70551a";
export const HOVER_COLOR = "rgba(163, 1, 52, 0.4)";
export const ZOOM_OUT_VAL = 8.6;
export const DOHA_FLAG_COLOR = "#8A1538";
export const DOHA_FLAG_COLOR_RGBA_06 = "rgba(138, 21, 56, 0.6)";
