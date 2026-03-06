import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./state/store.ts";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { CityScreen } from "./screens/CityScreen.tsx";
import { PopulationScreen } from "./screens/PopulationScreen.tsx";
import { EmploymentScreen } from "./screens/EmploymentScreen.tsx";
import { EstablishmentScreen } from "./screens/EstablishmentScreen.tsx";
import { BuildingScreen } from "./screens/BuildingScreen.tsx";
import { HouseholdScreen } from "./screens/HouseholdScreen.tsx";
// 1. Import New Screen
import { DisabilityScreen } from "./screens/DisabilityScreen.tsx";
import { MapLayout } from "./layouts/MapLayout.tsx";
import { MapProvider } from "react-map-gl";

const Root = () => (
  <StrictMode>
    <Provider store={store}>
      <MapProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route element={<MapLayout />}>
              <Route path="/city" element={<CityScreen />} />
              <Route path="/population" element={<PopulationScreen />} />
              <Route path="/building" element={<BuildingScreen />} />
              <Route path="/employment" element={<EmploymentScreen />} />
              <Route path="/establishment" element={<EstablishmentScreen />} />
              <Route path="/household" element={<HouseholdScreen />} />
              {/* 2. Add Route */}
              <Route path="/disability" element={<DisabilityScreen />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MapProvider>
    </Provider>
  </StrictMode>
);

const root = createRoot(document.getElementById("root")!);
root.render(<Root />);
