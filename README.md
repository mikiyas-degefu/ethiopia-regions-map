# ethiopia-regions-map

Ethiopia's **14 admin1 regions** (post-SNNPR split, 2025) as ready-to-render SVG paths + metadata. Zero runtime dependencies. ESM + CJS + TypeScript types.

<p align="center">
  <img src="https://raw.githubusercontent.com/mikiyas-degefu/ethiopia-regions-map/main/assets/preview-outline.svg" alt="Ethiopia 14-region outline map with region codes" width="48%" />
  &nbsp;
  <img src="https://raw.githubusercontent.com/mikiyas-degefu/ethiopia-regions-map/main/assets/preview-choropleth.svg" alt="Ethiopia 14-region choropleth with sample population data" width="48%" />
</p>

<p align="center">
  <sub>Both images above are rendered by <code>renderEthiopiaMap()</code> from this package — no external image editor involved.</sub>
</p>

The 14 regions covered:

| Code | Name                  | Type    | Capital       | Since |
| ---- | --------------------- | ------- | ------------- | ----- |
| TI   | Tigray                | region  | Mekelle       | 1995  |
| AF   | Afar                  | region  | Semera        | 1995  |
| AM   | Amhara                | region  | Bahir Dar     | 1995  |
| BG   | Benishangul-Gumuz     | region  | Asosa         | 1995  |
| OR   | Oromia                | region  | Addis Ababa   | 1995  |
| SO   | Somali                | region  | Jijiga        | 1995  |
| HA   | Harari                | region  | Harar         | 1995  |
| GA   | Gambela               | region  | Gambela       | 1995  |
| AA   | Addis Ababa           | city    | Addis Ababa   | 1995  |
| DD   | Dire Dawa             | city    | Dire Dawa     | 2004  |
| SI   | Sidama                | region  | Hawassa       | 2020  |
| SW   | South West Ethiopia   | region  | Bonga         | 2021  |
| CE   | Central Ethiopia      | region  | Hosaena       | 2023  |
| SE   | South Ethiopia        | region  | Wolaita Sodo  | 2023  |

## Install

```bash
npm install ethiopia-regions-map
```

## Use

### Drop-in choropleth

```ts
import { renderEthiopiaMap } from 'ethiopia-regions-map'

const svg = renderEthiopiaMap({
  values: { OR: 12.3, AM: 9.8, TI: 5.1, AA: 3.2 },
  palette: 'blue',
  width: 800,
  showLabels: true,
})

document.getElementById('map')!.innerHTML = svg
```

`renderEthiopiaMap` returns a complete `<svg>` string. Drop it into vanilla DOM, React's `dangerouslySetInnerHTML`, Vue's `v-html`, or write it to a file in Node — no DOM polyfill needed.

### Use the raw geometry yourself

If you want to build your own renderer (React component, D3 selection, framer-motion animation, …), import the data directly:

```ts
import {
  ETHIOPIA_GEOMETRY,
  ETHIOPIA_RENDER_ORDER,
  ETHIOPIA_VIEWBOX,
  ETHIOPIAN_REGIONS,
} from 'ethiopia-regions-map'

// React example
<svg viewBox={`0 0 ${ETHIOPIA_VIEWBOX.width} ${ETHIOPIA_VIEWBOX.height}`}>
  {ETHIOPIA_RENDER_ORDER.map((code) => (
    <path
      key={code}
      d={ETHIOPIA_GEOMETRY[code].d}
      fill="#e5e7eb"
      stroke="#fff"
      strokeWidth={0.8}
    />
  ))}
</svg>
```

### Lookups

```ts
import { getEthiopianRegion, findEthiopianRegionByName } from 'ethiopia-regions-map'

getEthiopianRegion('OR')             // { code: 'OR', name: 'Oromia', … }
findEthiopianRegionByName('amhara')  // { code: 'AM', name: 'Amhara', … } (case-insensitive)
```

## API

### Data

| Export                    | Type                                                 | What it is                                                    |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `ETHIOPIAN_REGIONS`       | `EthiopianRegion[]`                                  | All 14 regions with name, type, capital, year established.    |
| `ETHIOPIA_GEOMETRY`       | `Record<EthiopianRegionCode, EthiopianRegionGeometry>` | SVG `d` path + centroid for each region (viewBox 0 0 1000 774). |
| `ETHIOPIA_VIEWBOX`        | `{ width: 1000, height: 774 }`                       | Native SVG dimensions.                                        |
| `ETHIOPIA_RENDER_ORDER`   | `EthiopianRegionCode[]`                              | Suggested z-order — enclaves (AA, DD, HA) paint last.         |

### Helpers

| Export                                              | Returns                          |
| --------------------------------------------------- | -------------------------------- |
| `getEthiopianRegion(code: string)`                  | `EthiopianRegion \| undefined`   |
| `findEthiopianRegionByName(name: string)`           | `EthiopianRegion \| undefined`   |
| `renderEthiopiaMap(options?: RenderOptions)`        | `string` (SVG markup)            |

### `RenderOptions`

#### Data input

| Option        | Default     | Description                                                            |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| `values`      | `undefined` | `{ [RegionCode]: number }` — tints each region by the colour scale.    |
| `minValue`    | auto        | Clamp the colour scale's low end.                                      |
| `maxValue`    | auto        | Clamp the colour scale's high end.                                     |

#### Colour

| Option         | Default     | Description                                                                 |
| -------------- | ----------- | --------------------------------------------------------------------------- |
| `palette`      | `'green'`   | One of `'blue' \| 'green' \| 'red' \| 'amber' \| 'violet' \| 'teal' \| 'slate' \| 'diverging-rdbu' \| 'diverging-brbg' \| 'diverging-piyg'`. |
| `customPalette`| `undefined` | `{ min, mid?, max, diverging }` — overrides `palette`.                      |
| `colorSteps`   | `1`         | Quantize the scale into N discrete buckets. `5` → classic stepped choropleth. |
| `defaultFill`  | `'#e5e7eb'` | Fill when `values` is not supplied.                                         |
| `noDataColor`  | `'#f3f4f6'` | Fill for regions missing from `values`.                                     |

#### Stroke

| Option        | Default     | Description                          |
| ------------- | ----------- | ------------------------------------ |
| `stroke`      | `'#ffffff'` | Boundary colour.                     |
| `strokeWidth` | `0.8`       | Boundary width in SVG units.         |

#### Layout

| Option | Default | Description                                                |
| ------ | ------- | ---------------------------------------------------------- |
| `width`| `1000`  | Output SVG width in pixels (height derived from aspect).   |

#### Labels

| Option        | Default     | Description                                                                                |
| ------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `regionLabel` | `'none'`    | `'code'` (TI, OR …) · `'name'` (Oromia …) · `'none'` · or `(region) => string` for custom. |
| `showLabels`  | `false`     | Legacy shortcut — `true` is equivalent to `regionLabel: 'code'`.                           |
| `labelSize`   | `11`        | Font size for labels.                                                                      |

#### Behavior

| Option        | Default     | Description                                                                                          |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `valueFormat` | stringify   | `(value, code) => string` — format numbers in tooltips and legend (e.g. `(v) => v.toFixed(1) + ' M'`). |
| `legend`      | `false`     | `true` or `LegendOptions { position, title, steps, format }` — render an in-SVG colour legend.       |
| `highlight`   | `[]`        | Region codes to emphasize (repainted last with a thicker stroke + `is-highlight` class).             |
| `exclude`     | `[]`        | Region codes to skip rendering entirely.                                                             |

#### DOM hooks

| Option          | Default                  | Description                                          |
| --------------- | ------------------------ | ---------------------------------------------------- |
| `pathClassName` | `'ethiopia-region'`      | Class on each `<path>`. Hook CSS hover or click.     |
| `svgClassName`  | `'ethiopia-regions-map'` | Class on the root `<svg>`.                           |

Each `<path>` carries `data-code`, `data-name`, and (when applicable) `data-value` attributes — handy for event delegation:

```js
document.querySelector('.ethiopia-regions-map').addEventListener('mouseover', (e) => {
  const path = e.target.closest('.ethiopia-region')
  if (path) console.log(path.dataset.code, path.dataset.value)
})
```

## Style presets

Curated style bundles — spread them into your options to get a finished look in one line:

```ts
import { presets, renderEthiopiaMap } from 'ethiopia-regions-map'

renderEthiopiaMap({ ...presets.newspaper, values: myData })
```

| Preset      | What it looks like                                                            |
| ----------- | ----------------------------------------------------------------------------- |
| `newspaper` | Slate palette, white fill, thin dark borders, region codes labelled.          |
| `dark`      | Inverted background, blue palette — for dark dashboards.                      |
| `minimal`   | No borders, soft fill — clean hero illustration.                              |
| `bold`      | Red palette, heavy borders, full region names labelled.                       |

Override any single field after the spread — the bundle is just a `Partial<RenderOptions>`:

```ts
renderEthiopiaMap({
  ...presets.newspaper,
  values: myData,
  legend: { title: 'Population (M)' },   // add a legend on top of the preset
})
```

## How accurate is the geometry?

Boundary polygons are derived from [geoBoundaries](https://www.geoboundaries.org) **gbOpen ETH ADM1 + ADM2** (2025 release):

- 10 standard regions come straight from ADM1.
- **SI / SW / CE / SE** — the four regions created from the SNNPR breakup (Sidama 2020, South West 2021, Central Ethiopia + South Ethiopia 2023) — are built by unioning their constituent ADM2 zones (woredas).

Polygons are pre-projected to an SVG pixel grid (equirectangular with cos(lat) correction) — there's no runtime projection cost. If you need raw GeoJSON in lon/lat, use geoBoundaries directly.

## License

MIT © Mikiyas Degefu. Boundary data attributable to [geoBoundaries](https://www.geoboundaries.org) under CC-BY 4.0.
