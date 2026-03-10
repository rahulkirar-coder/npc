import type { LayerProps } from "react-map-gl";

// Define the Map State interface
export interface MapState {
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  activeLayerId: string | null;
  geoJsonData: any | null;
  // UPDATED: Allow single layer config or array of configs
  layerConfig: LayerProps | LayerProps[] | null;
}

export type AppSliceState = {
  populationFile: string | null;
  rawData: any[] | null;
  zoneData: any[] | null;
  map: MapState;
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: number | null;
  loadingDuration: number; // New field for custom simulated duration
  isRightPanelOpen: boolean;
};

export type AppState = {
  app: AppSliceState;
};

const INITIAL_MAP_STATE: MapState = {
  viewState: {
    latitude: 25.3548,
    longitude: 51.1839,
    zoom: 9,
    pitch: 0,
    bearing: 0,
  },
  activeLayerId: null,
  geoJsonData: null,
  layerConfig: null,
};

const INITIAL_STATE: AppSliceState = {
  populationFile: null,
  rawData: null,
  zoneData: null,
  map: INITIAL_MAP_STATE,
  isLoading: false,
  loadingMessage: "Analyzing Data...",
  loadingProgress: null,
  loadingDuration: 0, // Default to 0 (Fast mode)
  isRightPanelOpen: true,
};

// Action types
const SET_POPULATION_FILE = "app/SET_POPULATION_FILE";
const SET_RAW_DATA = "app/SET_RAW_DATA";
const SET_ZONE_DATA = "app/SET_ZONE_DATA";
const UPDATE_VIEW_STATE = "app/UPDATE_VIEW_STATE";
const SET_MAP_LAYER = "app/SET_MAP_LAYER";
const SET_LOADING = "app/SET_LOADING";
const SET_LOADING_MESSAGE = "app/SET_LOADING_MESSAGE";
const SET_LOADING_PROGRESS = "app/SET_LOADING_PROGRESS";
const SET_LOADING_DURATION = "app/SET_LOADING_DURATION";
const TOGGLE_RIGHT_PANEL = "app/TOGGLE_RIGHT_PANEL";

// Reducer
export const appReducer = (
  state = INITIAL_STATE,
  action: any,
): AppSliceState => {
  switch (action.type) {
    case SET_POPULATION_FILE:
      return { ...state, populationFile: action.payload };
    case SET_RAW_DATA:
      return { ...state, rawData: action.payload };
    case SET_ZONE_DATA:
      return { ...state, zoneData: action.payload };
    case UPDATE_VIEW_STATE:
      return {
        ...state,
        map: {
          ...state.map,
          viewState: { ...state.map.viewState, ...action.payload },
        },
      };
    case SET_MAP_LAYER:
      return {
        ...state,
        map: {
          ...state.map,
          activeLayerId: action.payload.id,
          geoJsonData: action.payload.data,
          layerConfig: action.payload.config,
          viewState: action.payload.viewState
            ? { ...state.map.viewState, ...action.payload.viewState }
            : state.map.viewState,
        },
      };
    case SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || state.loadingMessage,
        loadingDuration: action.payload.duration || 0, // Store the duration
        loadingProgress: null,
      };
    case SET_LOADING_PROGRESS:
      return {
        ...state,
        loadingProgress: action.payload,
      };
    case SET_LOADING_MESSAGE:
      return {
        ...state,
        loadingMessage: action.payload,
      };

    case SET_LOADING_DURATION:
      return {
        ...state,
        loadingDuration: action.payload,
      };
    case TOGGLE_RIGHT_PANEL:
      return {
        ...state,
        isRightPanelOpen: !state.isRightPanelOpen,
      };
    default:
      return state;
  }
};

// --- Actions ---
export const setPopulationFile = (fileName: any) => ({
  type: SET_POPULATION_FILE,
  payload: fileName,
});

export const setRawData = (data: any) => ({
  type: SET_RAW_DATA,
  payload: data,
});

export const setZoneData = (data: any[]) => ({
  type: SET_ZONE_DATA,
  payload: data,
});

export const updateViewState = (viewState: Partial<MapState["viewState"]>) => ({
  type: UPDATE_VIEW_STATE,
  payload: viewState,
});

// UPDATED: config type definition
export const setMapLayer = (
  id: string,
  data: any,
  config: LayerProps | LayerProps[],
  viewState?: Partial<MapState["viewState"]>,
) => ({
  type: SET_MAP_LAYER,
  payload: { id, data, config, viewState },
});

export const setLoading = (
  isLoading: boolean,
  message: string = "Processing...",
  duration: number = 0, // New optional parameter
) => ({
  type: SET_LOADING,
  payload: { isLoading, message, duration },
});

export const setLoadingProgress = (progress: number | null) => ({
  type: SET_LOADING_PROGRESS,
  payload: progress,
});

export const setLoadingMessage = (text: string) => ({
  type: SET_LOADING_MESSAGE,
  payload: text,
});

export const setLoadingDuration = (duration: number) => ({
  type: SET_LOADING_DURATION,
  payload: duration,
});

export const toggleRightPanel = () => ({
  type: TOGGLE_RIGHT_PANEL,
});
