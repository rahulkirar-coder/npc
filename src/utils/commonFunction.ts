export const getValidNumber = (value: any) => {
  if (value === "NaN" || Number.isNaN(value)) {
    return 0;
  }
  return value;
};

export const getRouteFromGraphScreen = (screen: string) => {
  let route = "";
  switch (screen) {
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
  return route;
};

export const mapCall = (map: any, navigate: any, route: string, navigationState: any) => {
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
}