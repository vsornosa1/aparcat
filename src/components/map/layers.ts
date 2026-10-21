export interface MapLayerVisibility {
  garages: boolean;
  reports: boolean;
  ora: boolean;
  cameras: boolean;
}

export const DEFAULT_LAYERS: MapLayerVisibility = {
  garages: true,
  reports: true,
  ora: true,
  cameras: false,
};
