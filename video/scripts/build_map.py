"""Turns the raw data in data/raw/ into compact SVG paths in src/data/.

Everything is projected to Web Mercator pixels at zoom 16 (about 1.8 m per
unit in Valencia), relative to the top-left corner of the bounding box, so
scenes can frame any part of the city with one translate + scale.

    python scripts/build_map.py

Inputs (from scripts/fetch-data.sh): osm.json, map.json, ora.json,
nearby-alameda.json. Outputs: src/data/city.json, src/data/layers.json.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data' / 'raw'
OUT = ROOT / 'src' / 'data'

ZOOM = 16
LON0, LAT0 = -0.432, 39.512  # top-left of the box
LON1, LAT1 = -0.300, 39.420  # bottom-right

ROAD_CLASSES = {
    'major': {'motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link',
              'primary_link'},
    'secondary': {'secondary', 'tertiary', 'secondary_link',
                  'tertiary_link'},
    'minor': {'unclassified', 'residential', 'living_street', 'pedestrian'},
}
TOLERANCE = {'major': 1.2, 'secondary': 1.2, 'minor': 1.6}


def world(lon, lat):
    scale = 256 * 2 ** ZOOM
    s = math.sin(math.radians(lat))
    x = (lon + 180) / 360 * scale
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * scale
    return x, y


X0, Y0 = world(LON0, LAT0)
X1, Y1 = world(LON1, LAT1)


def project(lon, lat):
    x, y = world(lon, lat)
    return x - X0, y - Y0


def rdp(points, eps):
    """Ramer-Douglas-Peucker, iterative."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, index = 0.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            # Closed rings start and end on the same point: measure from it.
            d = (abs(dy * (px - ax) - dx * (py - ay)) / norm if norm > 1e-9
                 else math.hypot(px - ax, py - ay))
            if d > best:
                best, index = d, i
        if best > eps and index > 0:
            keep[index] = True
            stack.append((a, index))
            stack.append((index, b))
    return [p for p, k in zip(points, keep) if k]


def fmt(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def path(rings, closed=False, eps=1.0):
    parts = []
    for ring in rings:
        pts = rdp(ring, eps)
        if len(pts) < 2:
            continue
        head = f'M{fmt(pts[0][0])} {fmt(pts[0][1])}'
        body = ''.join(
            f'l{fmt(x1 - x0)} {fmt(y1 - y0)}'
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]))
        parts.append(head + body + ('z' if closed else ''))
    return ''.join(parts)


def geometry(element):
    return [project(p['lon'], p['lat']) for p in element.get('geometry', [])]


def join_rings(ways):
    """Joins open way segments end to end into rings (multipolygons)."""
    ways = [w[:] for w in ways if len(w) > 1]
    rings = []
    while ways:
        ring = ways.pop(0)
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, w in enumerate(ways):
                if w[0] == ring[-1]:
                    ring += w[1:]
                elif w[-1] == ring[-1]:
                    ring += w[::-1][1:]
                elif w[-1] == ring[0]:
                    ring = w[:-1] + ring
                elif w[0] == ring[0]:
                    ring = w[::-1][:-1] + ring
                else:
                    continue
                ways.pop(i)
                changed = True
                break
        rings.append(ring)
    return rings


def polygons(elements):
    rings = []
    for el in elements:
        if el['type'] == 'way':
            g = geometry(el)
            if len(g) > 2:
                rings.append(g)
        else:
            outer = [geometry(m) for m in el.get('members', [])
                     if m.get('role') == 'outer' and m.get('type') == 'way']
            rings += [r for r in join_rings(outer) if len(r) > 2]
    return rings


def build_city():
    osm = json.loads((RAW / 'osm.json').read_text(encoding='utf-8'))
    roads = {name: [] for name in ROAD_CLASSES}
    parks, water, beach, coast = [], [], [], []
    for el in osm['elements']:
        tags = el.get('tags', {})
        hw = tags.get('highway')
        if el['type'] == 'way' and hw:
            for name, kinds in ROAD_CLASSES.items():
                if hw in kinds:
                    roads[name].append(geometry(el))
        elif tags.get('leisure') == 'park':
            parks.append(el)
        elif tags.get('natural') == 'water':
            water.append(el)
        elif tags.get('natural') == 'beach':
            beach.append(el)
        elif tags.get('natural') == 'coastline':
            coast.append(geometry(el))

    # The sea: chain the coastline and close it far out to the east.
    sea = []
    for chain in join_rings(coast):
        if len(chain) < 2:
            continue
        east = X1 - X0 + 2000
        first, last = chain[0], chain[-1]
        sea.append(chain + [(east, last[1]), (east, first[1])])

    city = {
        'zoom': ZOOM,
        'origin': [LON0, LAT0],
        'size': [round(X1 - X0), round(Y1 - Y0)],
        'roads': {name: path(lines, eps=TOLERANCE[name])
                  for name, lines in roads.items()},
        'parks': path(polygons(parks), closed=True, eps=1.2),
        'water': path(polygons(water), closed=True, eps=1.2),
        'beach': path(polygons(beach), closed=True, eps=1.2),
        'sea': path(sea, closed=True, eps=1.2),
    }
    (OUT / 'city.json').write_text(json.dumps(city, separators=(',', ':')),
                                   encoding='utf-8')
    sizes = {k: len(v) if isinstance(v, str) else sum(map(len, v.values()))
             for k, v in city.items() if k in
             ('roads', 'parks', 'water', 'beach', 'sea')}
    print('city.json', sizes)
    return osm


def build_layers():
    data = json.loads((RAW / 'map.json').read_text(encoding='utf-8'))
    ora = json.loads((RAW / 'ora.json').read_text(encoding='utf-8'))
    nearby = json.loads((RAW / 'nearby-alameda.json').read_text(
        encoding='utf-8'))

    garages = []
    for f in data['layers']['facilities']['features']:
        p = f['properties']
        x, y = project(*f['geometry']['coordinates'])
        garages.append({'id': p['id'], 'name': p['name'].strip(),
                        'free': p['freeSpaces'], 'capacity': p['capacity'],
                        'x': round(x, 1), 'y': round(y, 1)})

    cameras = []
    for f in data['layers']['cameras']['features']:
        x, y = project(*f['geometry']['coordinates'])
        cameras.append([round(x, 1), round(y, 1)])

    by_color = {}
    for f in ora['features']:
        color = f['properties']['color']
        rings = [[project(lon, lat) for lon, lat in ring]
                 for ring in f['geometry']['coordinates'][:1]]
        by_color.setdefault(color, []).extend(rings)
    ora_paths = {c: path(r, closed=True, eps=0.8) for c, r in by_color.items()}

    origin = project(nearby['origin']['longitude'],
                     nearby['origin']['latitude'])
    candidates = [{'name': c['name'].strip(), 'free': c['freeSpaces'],
                   'walk': c['walkingMinutes'],
                   'distance': round(c['distanceMeters']),
                   'freshness': c['freshness'], 'age': c['ageMinutes']}
                  for c in nearby['candidates']]

    camera_of_interest = next(
        f for f in data['layers']['cameras']['features']
        if f['properties']['id'] == '02310')
    cx, cy = project(*camera_of_interest['geometry']['coordinates'])

    layers = {
        'snapshot': data['generatedAt'],
        'garages': garages,
        'cameras': cameras,
        'ora': ora_paths,
        'oraCount': {c: len(r) for c, r in by_color.items()},
        'nearby': {'origin': [round(origin[0], 1), round(origin[1], 1)],
                   'radius': nearby['radiusMeters'],
                   'generatedAt': nearby['generatedAt'],
                   'candidates': candidates},
        'camera': {'id': '02310',
                   'title': camera_of_interest['properties']['description'],
                   'x': round(cx, 1), 'y': round(cy, 1)},
    }
    (OUT / 'layers.json').write_text(
        json.dumps(layers, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8')
    print('layers.json', {k: len(v) for k, v in ora_paths.items()},
          len(cameras), 'cameras', len(garages), 'garages')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_city()
    build_layers()


if __name__ == '__main__':
    main()
