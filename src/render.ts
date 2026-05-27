/**
 * Vanilla SVG renderer for Ethiopia's 14 admin1 regions.
 *
 * Produces a complete `<svg>...</svg>` string with one `<path>` per region,
 * optionally tinted by a value→colour scale (linear or diverging). Returned
 * SVG is framework-agnostic — drop it into a `.innerHTML`, a React
 * `dangerouslySetInnerHTML`, or write it to a file with `fs.writeFileSync`.
 *
 * Why a string and not a DOM tree? Keeps the package zero-runtime-dep and
 * usable in SSR / Node without jsdom.
 */
import {
  ETHIOPIA_GEOMETRY,
  ETHIOPIA_RENDER_ORDER,
  ETHIOPIA_VIEWBOX,
  ETHIOPIAN_REGIONS,
  getEthiopianRegion,
  type EthiopianRegionCode,
} from './ethiopia-regions'

// ────────────────────────────────────────────────────────────────
// Palette presets — picked to match common BI defaults. Diverging
// palettes apply a midpoint colour for the mean of the value range.
// ────────────────────────────────────────────────────────────────

export type PaletteName =
  | 'blue'
  | 'green'
  | 'red'
  | 'amber'
  | 'violet'
  | 'teal'
  | 'slate'
  | 'diverging-rdbu'
  | 'diverging-brbg'
  | 'diverging-piyg'

interface PaletteStops {
  min: string
  mid?: string
  max: string
  diverging: boolean
}

export const PALETTES: Record<PaletteName, PaletteStops> = {
  blue: { min: '#e0f2fe', max: '#075985', diverging: false },
  green: { min: '#dcfce7', max: '#14532d', diverging: false },
  red: { min: '#fee2e2', max: '#7f1d1d', diverging: false },
  amber: { min: '#fef3c7', max: '#78350f', diverging: false },
  violet: { min: '#ede9fe', max: '#4c1d95', diverging: false },
  teal: { min: '#ccfbf1', max: '#134e4a', diverging: false },
  slate: { min: '#e2e8f0', max: '#0f172a', diverging: false },
  'diverging-rdbu': { min: '#b2182b', mid: '#f7f7f7', max: '#2166ac', diverging: true },
  'diverging-brbg': { min: '#8c510a', mid: '#f5f5f5', max: '#01665e', diverging: true },
  'diverging-piyg': { min: '#c51b7d', mid: '#f7f7f7', max: '#4d9221', diverging: true },
}

export interface RenderOptions {
  /**
   * Map of region code → numeric value used to tint the region. Missing
   * regions are rendered with `noDataColor`. If omitted, every region uses
   * `defaultFill`.
   */
  values?: Partial<Record<EthiopianRegionCode, number>>
  /** Built-in palette name. Ignored when `customPalette` is provided. */
  palette?: PaletteName
  /** Custom `{min, mid?, max, diverging}` palette. */
  customPalette?: PaletteStops
  /** Fill for regions when no `values` are supplied. */
  defaultFill?: string
  /** Fill for regions present in `values` but with `undefined`/`null`. */
  noDataColor?: string
  /** Stroke colour for region boundaries. */
  stroke?: string
  /** Stroke width in SVG units. */
  strokeWidth?: number
  /** Output SVG width in CSS pixels. Height is derived to keep aspect. */
  width?: number
  /** If true, embed the region's name as a text label near its centroid. */
  showLabels?: boolean
  /** Font size in SVG units for the labels. */
  labelSize?: number
  /** Min value for the scale. Defaults to min of `values`. */
  minValue?: number
  /** Max value for the scale. Defaults to max of `values`. */
  maxValue?: number
  /**
   * Extra class to put on each region's `<path>` element — handy for hooking
   * up CSS hover styles or DOM event listeners.
   */
  pathClassName?: string
  /** Class on the root `<svg>` element. */
  svgClassName?: string
}

const DEFAULT_OPTS: Required<
  Pick<
    RenderOptions,
    'palette' | 'defaultFill' | 'noDataColor' | 'stroke' | 'strokeWidth' | 'showLabels' | 'labelSize' | 'pathClassName' | 'svgClassName'
  >
> = {
  palette: 'green',
  defaultFill: '#e5e7eb',
  noDataColor: '#f3f4f6',
  stroke: '#ffffff',
  strokeWidth: 0.8,
  showLabels: false,
  labelSize: 11,
  pathClassName: 'ethiopia-region',
  svgClassName: 'ethiopia-regions-map',
}

/**
 * Render the 14-region map as a single SVG string.
 *
 * @example
 * const svg = renderEthiopiaMap({
 *   values: { OR: 12.3, AM: 9.8, TI: 5.1 },
 *   palette: 'blue',
 *   width: 800,
 * })
 * document.getElementById('map').innerHTML = svg
 */
export function renderEthiopiaMap(options: RenderOptions = {}): string {
  const opts = { ...DEFAULT_OPTS, ...options }
  const palette =
    options.customPalette ??
    PALETTES[opts.palette as PaletteName] ??
    PALETTES.green

  const { vb, aspectHeight } = computeViewBox(options.width)

  const scale = makeScale(options, palette)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeAttr(opts.svgClassName)}" viewBox="${vb}" width="${options.width ?? ETHIOPIA_VIEWBOX.width}" height="${aspectHeight}" role="img" aria-label="Ethiopia 14-region administrative map">`,
  )
  parts.push('<title>Ethiopia · 14 administrative regions</title>')

  for (const code of ETHIOPIA_RENDER_ORDER) {
    const geom = ETHIOPIA_GEOMETRY[code]
    const region = getEthiopianRegion(code)
    const value = options.values?.[code]
    const fill =
      value === undefined || value === null || Number.isNaN(value)
        ? options.values
          ? opts.noDataColor
          : opts.defaultFill
        : scale(value as number)

    const titleParts = [region?.name ?? code]
    if (value !== undefined && value !== null && !Number.isNaN(value)) {
      titleParts.push(String(value))
    }

    parts.push(
      `<path class="${escapeAttr(opts.pathClassName)}" data-code="${code}" data-name="${escapeAttr(region?.name ?? '')}"${value != null ? ` data-value="${value}"` : ''} fill="${fill}" stroke="${escapeAttr(opts.stroke)}" stroke-width="${opts.strokeWidth}" stroke-linejoin="round" d="${geom.d}"><title>${escapeText(titleParts.join(' — '))}</title></path>`,
    )
  }

  if (opts.showLabels) {
    for (const r of ETHIOPIAN_REGIONS) {
      const geom = ETHIOPIA_GEOMETRY[r.code]
      const [cx, cy] = geom.centroid
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${opts.labelSize}" font-family="system-ui, -apple-system, sans-serif" font-weight="500" fill="#111827" pointer-events="none">${escapeText(r.code)}</text>`,
      )
    }
  }

  parts.push('</svg>')
  return parts.join('')
}

// ────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────

function computeViewBox(targetWidth?: number) {
  const vb = `0 0 ${ETHIOPIA_VIEWBOX.width} ${ETHIOPIA_VIEWBOX.height}`
  const aspectHeight = targetWidth
    ? Math.round((targetWidth / ETHIOPIA_VIEWBOX.width) * ETHIOPIA_VIEWBOX.height)
    : ETHIOPIA_VIEWBOX.height
  return { vb, aspectHeight }
}

function makeScale(
  opts: RenderOptions,
  palette: PaletteStops,
): (v: number) => string {
  const vals = opts.values ? Object.values(opts.values).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v)) : []
  if (vals.length === 0) return () => palette.min
  const min = opts.minValue ?? Math.min(...vals)
  const max = opts.maxValue ?? Math.max(...vals)
  if (min === max) return () => palette.max

  if (palette.diverging && palette.mid) {
    const mid = (min + max) / 2
    return (v: number) => {
      if (v <= mid) {
        const t = (v - min) / (mid - min || 1)
        return lerpColor(palette.min, palette.mid!, clamp01(t))
      }
      const t = (v - mid) / (max - mid || 1)
      return lerpColor(palette.mid!, palette.max, clamp01(t))
    }
  }

  return (v: number) => {
    const t = (v - min) / (max - min)
    return lerpColor(palette.min, palette.max, clamp01(t))
  }
}

function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return rgbToHex(r, g, bl)
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
