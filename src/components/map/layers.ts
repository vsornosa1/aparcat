export interface MapLayerVisibility {
  garages: boolean;
  reports: boolean;
  streets: boolean;
  cameras: boolean;
}

export const DEFAULT_LAYERS: MapLayerVisibility = {
  garages: true,
  reports: true,
  streets: false,
  cameras: false,
};
