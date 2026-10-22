#!/bin/sh
# Downloads the real data the film is drawn from into data/raw/ (gitignored):
# Aparcat's own API (garages, cameras, ORA, nearby) and OpenStreetMap streets.
set -e
cd "$(dirname "$0")/../data/raw"
API=https://aparcat.vercel.app/api
curl -sf -o map.json "$API/parking/map"
curl -sf -o ora.json "$API/parking/ora"
curl -sf -o nearby-alameda.json "$API/parking/nearby?lat=39.4746&lng=-0.3650"

BBOX=39.420,-0.432,39.512,-0.300
curl -sf -A "aparcat-video/0.1 (+https://github.com/vsornosa1/aparcat)" \
  -o osm.json https://overpass-api.de/api/interpreter --data-urlencode "data=
[out:json][timeout:120];
(
  way[highway~\"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$\"]($BBOX);
  way[leisure=park]($BBOX);
  relation[leisure=park]($BBOX);
  way[natural=water]($BBOX);
  relation[natural=water]($BBOX);
  way[natural=coastline](39.40,-0.36,39.53,-0.28);
  way[natural=beach]($BBOX);
  way[landuse=harbour]($BBOX);
);
out geom;"
ls -la
