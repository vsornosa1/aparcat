export interface MapLayerVisibility {
  garages: boolean;
  reports: boolean;
  ora: boolean;
  streets: boolean;
  cameras: boolean;
}

export const DEFAULT_LAYERS: MapLayerVisibility = {
  garages: true,
  reports: true,
  ora: true,
  streets: false,
  cameras: false,
};
