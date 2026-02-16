import { combineReducers, legacy_createStore as createStore } from "redux";
import { appReducer } from "./appReducer";

const reducers = combineReducers({
  app: appReducer,
});

export const store = createStore(reducers);
