export const MIN_MATCH_RADIUS_KM = 5;
export const MAX_MATCH_RADIUS_KM = 250;
export const DEFAULT_MATCH_RADIUS_KM = 50;

export const clampMatchRadiusKm = (radiusKm: number) =>
  Math.min(
    MAX_MATCH_RADIUS_KM,
    Math.max(MIN_MATCH_RADIUS_KM, Math.round(radiusKm)),
  );

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const getDistanceKm = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) => {
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatRadians = toRadians(fromLatitude);
  const toLatRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatRadians) *
      Math.cos(toLatRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
};

export const formatDistanceKm = (distanceKm?: number) => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  if (distanceKm < 1) {
    return "<1 km";
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1).replace(".0", "")} km`;
  }

  return `${Math.round(distanceKm)} km`;
};
