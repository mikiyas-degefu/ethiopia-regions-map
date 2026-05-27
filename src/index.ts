/**
 * ethiopia-regions-map
 *
 * Ethiopia's 14 admin1 regions (post-SNNPR split, 2025) as ready-to-render
 * SVG paths + metadata. Zero runtime dependencies — ships as ESM + CJS with
 * full TypeScript types.
 *
 * Quick start:
 *
 *   import { renderEthiopiaMap } from 'ethiopia-regions-map'
 *
 *   const svg = renderEthiopiaMap({
 *     values: { OR: 12, AM: 9, TI: 5 },
 *     palette: 'blue',
 *     width: 800,
 *   })
 *
 *   document.getElementById('map').innerHTML = svg
 *
 * Or use the raw data directly:
 *
 *   import { ETHIOPIA_GEOMETRY, ETHIOPIAN_REGIONS } from 'ethiopia-regions-map'
 */

export {
  ETHIOPIAN_REGIONS,
  ETHIOPIA_GEOMETRY,
  ETHIOPIA_VIEWBOX,
  ETHIOPIA_RENDER_ORDER,
  getEthiopianRegion,
  findEthiopianRegionByName,
} from './ethiopia-regions'

export type {
  EthiopianRegionCode,
  EthiopianRegion,
  EthiopianRegionGeometry,
  AdminType,
} from './ethiopia-regions'

export { renderEthiopiaMap, PALETTES } from './render'
export type { PaletteName, RenderOptions } from './render'
