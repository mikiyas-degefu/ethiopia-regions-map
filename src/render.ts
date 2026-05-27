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
  type EthiopianRegion,
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

export interface PaletteStops {
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

// ────────────────────────────────────────────────────────────────
// Public types added in 0.2
// ────────────────────────────────────────────────────────────────

/** Format a value for tooltips + legend. */
export type ValueFormatter = (
  value: number,
  code: EthiopianRegionCode,
) => string

/**
 * What text to render at each region's centroid.
 *  - `'code'` — two-letter code (default when labels are on)
 *  - `'name'` — full region name
 *  - `'none'` — no label
 *  - `(region) => string` — fully custom
 */
export type RegionLabelMode =
  | 'code'
  | 'name'
  | 'none'
  | ((region: EthiopianRegion) => string)

export type LegendPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface LegendOptions {
  /** Corner of the SVG to anchor the legend to. */
  position?: LegendPosition
  /** Optional title above the swatches. */
  title?: string
  /** Number of swatches. Defaults to `colorSteps` if set, else 5. */
  steps?: number
  /** Custom formatter for the min/max labels. Defaults to the chart's `valueFormat`. */
  format?: ValueFormatter
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
  /**
   * Legacy shortcut. If `regionLabel` is not set, `showLabels: true` is
   * equivalent to `regionLabel: 'code'`.
   */
  showLabels?: boolean
  /**
   * Controls the text rendered at each centroid. See `RegionLabelMode`.
   * Takes precedence over `showLabels` when set.
   */
  regionLabel?: RegionLabelMode
  /** Font size in SVG units for the labels. */
  labelSize?: number
  /** Min value for the scale. Defaults to min of `values`. */
  minValue?: number
  /** Max value for the scale. Defaults to max of `values`. */
  maxValue?: number
  /**
   * Quantize the colour scale into N discrete buckets. `1` (default) is a
   * smooth gradient; `5` produces a classic 5-step choropleth.
   */
  colorSteps?: number
  /** Format values shown in tooltips and the legend. */
  valueFormat?: ValueFormatter
  /**
   * Render a built-in colour legend inside the SVG. `true` uses defaults;
   * pass a `LegendOptions` object to customize position, title, steps, format.
   */
  legend?: boolean | LegendOptions
  /**
   * Region codes to emphasize — repainted on top with a thicker stroke and
   * the class `<pathClassName> is-highlight` applied for custom CSS.
   */
  highlight?: EthiopianRegionCode[]
  /** Region codes to skip rendering entirely. */
  exclude?: EthiopianRegionCode[]
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
    | 'palette'
    | 'defaultFill'
    | 'noDataColor'
    | 'stroke'
    | 'strokeWidth'
    | 'labelSize'
    | 'pathClassName'
    | 'svgClassName'
    | 'colorSteps'
  >
> = {
  palette: 'green',
  defaultFill: '#e5e7eb',
  noDataColor: '#f3f4f6',
  stroke: '#ffffff',
  strokeWidth: 0.8,
  labelSize: 11,
  pathClassName: 'ethiopia-region',
  svgClassName: 'ethiopia-regions-map',
  colorSteps: 1,
}

const DEFAULT_FORMATTER: ValueFormatter = (v) => String(v)

// ────────────────────────────────────────────────────────────────
// Style presets — drop-in `Partial<RenderOptions>` bundles
// for common "looks". Use with object spread.
// ────────────────────────────────────────────────────────────────

/**
 * Curated style bundles. Use with object spread:
 *
 *   renderEthiopiaMap({ ...presets.newspaper, values: myData })
 */
export const presets = {
  /** Light slate fills, thin dark borders — print-friendly. */
  newspaper: {
    palette: 'slate',
    stroke: '#1f2937',
    strokeWidth: 0.4,
    defaultFill: '#ffffff',
    noDataColor: '#f1f5f9',
    regionLabel: 'code',
  } as const,
  /** Inverted background, blue fills — great on dark dashboards. */
  dark: {
    palette: 'blue',
    stroke: '#1e293b',
    strokeWidth: 0.6,
    defaultFill: '#0f172a',
    noDataColor: '#1e293b',
  } as const,
  /** No borders, soft fills, no labels — clean hero illustration. */
  minimal: {
    palette: 'slate',
    stroke: 'none',
    strokeWidth: 0,
    defaultFill: '#f8fafc',
    regionLabel: 'none',
  } as const,
  /** Heavy red palette, thick borders, region names labelled. */
  bold: {
    palette: 'red',
    stroke: '#0f172a',
    strokeWidth: 1.5,
    regionLabel: 'name',
    labelSize: 13,
  } as const,
} satisfies Record<string, Partial<RenderOptions>>

// ────────────────────────────────────────────────────────────────
// Public renderer
// ────────────────────────────────────────────────────────────────

/**
 * Render the 14-region map as a single SVG string.
 *
 * @example
 * const svg = renderEthiopiaMap({
 *   values: { OR: 12.3, AM: 9.8, TI: 5.1 },
 *   palette: 'blue',
 *   colorSteps: 5,
 *   legend: { title: 'GDP (B USD)', position: 'bottom-right' },
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
  const { scale, linearScale, min, max, hasRange } = makeScale(options, palette)

  const labelMode = resolveLabelMode(options)
  const formatter = options.valueFormat ?? DEFAULT_FORMATTER
  const excludeSet = new Set(options.exclude ?? [])
  const highlightSet = new Set(options.highlight ?? [])

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeAttr(opts.svgClassName)}" viewBox="${vb}" width="${options.width ?? ETHIOPIA_VIEWBOX.width}" height="${aspectHeight}" role="img" aria-label="Ethiopia 14-region administrative map">`,
  )
  parts.push('<title>Ethiopia · 14 administrative regions</title>')

  // ── 1) Region paths (skip highlighted ones — they paint last, on top)
  for (const code of ETHIOPIA_RENDER_ORDER) {
    if (excludeSet.has(code) || highlightSet.has(code)) continue
    parts.push(renderRegionPath(code, options, opts, scale, formatter, false))
  }

  // ── 2) Highlighted region paths painted on top with emphasis
  for (const code of ETHIOPIA_RENDER_ORDER) {
    if (excludeSet.has(code) || !highlightSet.has(code)) continue
    parts.push(renderRegionPath(code, options, opts, scale, formatter, true))
  }

  // ── 3) Labels
  if (labelMode) {
    for (const r of ETHIOPIAN_REGIONS) {
      if (excludeSet.has(r.code)) continue
      const text = labelText(r, labelMode)
      if (!text) continue
      const [cx, cy] = ETHIOPIA_GEOMETRY[r.code].centroid
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${opts.labelSize}" font-family="system-ui, -apple-system, sans-serif" font-weight="500" fill="#111827" pointer-events="none">${escapeText(text)}</text>`,
      )
    }
  }

  // ── 4) Legend (top layer)
  if (options.legend && hasRange) {
    const cfg = typeof options.legend === 'object' ? options.legend : {}
    parts.push(
      renderLegend(
        cfg,
        min,
        max,
        cfg.steps ?? Math.max(opts.colorSteps, 5),
        linearScale,
        cfg.format ?? formatter,
        ETHIOPIA_VIEWBOX.width,
        ETHIOPIA_VIEWBOX.height,
      ),
    )
  }

  parts.push('</svg>')
  return parts.join('')
}

// ────────────────────────────────────────────────────────────────
// Render-loop helpers
// ────────────────────────────────────────────────────────────────

function renderRegionPath(
  code: EthiopianRegionCode,
  options: RenderOptions,
  opts: typeof DEFAULT_OPTS,
  scale: (v: number) => string,
  formatter: ValueFormatter,
  isHighlight: boolean,
): string {
  const geom = ETHIOPIA_GEOMETRY[code]
  const region = getEthiopianRegion(code)
  const value = options.values?.[code]
  const hasValue =
    value !== undefined && value !== null && !Number.isNaN(value)
  const fill = hasValue
    ? scale(value as number)
    : options.values
      ? opts.noDataColor
      : opts.defaultFill

  const titleParts = [region?.name ?? code]
  if (hasValue) titleParts.push(formatter(value as number, code))

  const className = isHighlight
    ? `${opts.pathClassName} is-highlight`
    : opts.pathClassName
  const strokeWidth = isHighlight ? opts.strokeWidth * 2.2 : opts.strokeWidth
  const stroke = isHighlight && opts.stroke === '#ffffff' ? '#0f172a' : opts.stroke

  return (
    `<path class="${escapeAttr(className)}"` +
    ` data-code="${code}"` +
    ` data-name="${escapeAttr(region?.name ?? '')}"` +
    (hasValue ? ` data-value="${value}"` : '') +
    ` fill="${fill}"` +
    ` stroke="${escapeAttr(stroke)}"` +
    ` stroke-width="${strokeWidth}"` +
    ` stroke-linejoin="round"` +
    ` d="${geom.d}">` +
    `<title>${escapeText(titleParts.join(' — '))}</title>` +
    `</path>`
  )
}

function resolveLabelMode(opts: RenderOptions): RegionLabelMode | null {
  if (opts.regionLabel !== undefined) {
    return opts.regionLabel === 'none' ? null : opts.regionLabel
  }
  // legacy showLabels → 'code'
  return opts.showLabels ? 'code' : null
}

function labelText(region: EthiopianRegion, mode: RegionLabelMode): string {
  if (typeof mode === 'function') return mode(region)
  if (mode === 'code') return region.code
  if (mode === 'name') return region.name
  return ''
}

// ────────────────────────────────────────────────────────────────
// Legend renderer
// ────────────────────────────────────────────────────────────────

function renderLegend(
  cfg: LegendOptions,
  min: number,
  max: number,
  steps: number,
  linearScale: (v: number) => string,
  format: ValueFormatter,
  vbWidth: number,
  vbHeight: number,
): string {
  const position = cfg.position ?? 'bottom-left'
  const title = cfg.title ?? ''
  const swatchSize = 22
  const padding = 14
  const titleHeight = title ? 18 : 0
  const labelHeight = 14
  const totalWidth = swatchSize * steps + padding * 2
  const totalHeight = swatchSize + titleHeight + labelHeight + padding * 1.4

  let x: number
  let y: number
  if (position.includes('right')) x = vbWidth - totalWidth - 16
  else x = 16
  if (position.includes('bottom')) y = vbHeight - totalHeight - 16
  else y = 16

  const swatchesY = y + padding * 0.4 + titleHeight

  const parts: string[] = []
  parts.push(
    `<g class="ethiopia-legend" transform="translate(0,0)" pointer-events="none">`,
  )
  parts.push(
    `<rect x="${x}" y="${y}" width="${totalWidth}" height="${totalHeight}" fill="rgba(255,255,255,0.94)" stroke="#cbd5e1" stroke-width="0.6" rx="6"/>`,
  )

  if (title) {
    parts.push(
      `<text x="${x + padding}" y="${y + titleHeight - 2}" font-size="11" font-family="system-ui,-apple-system,sans-serif" fill="#0f172a" font-weight="600">${escapeText(title)}</text>`,
    )
  }

  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0.5 : i / (steps - 1)
    const bucketValue = min + t * (max - min)
    const color = linearScale(bucketValue)
    parts.push(
      `<rect x="${x + padding + i * swatchSize}" y="${swatchesY}" width="${swatchSize}" height="${swatchSize}" fill="${color}" stroke="#ffffff" stroke-width="0.6"/>`,
    )
  }

  const labelY = swatchesY + swatchSize + labelHeight - 2
  parts.push(
    `<text x="${x + padding}" y="${labelY}" font-size="10" font-family="system-ui,-apple-system,sans-serif" fill="#475569">${escapeText(format(min, 'AA' as EthiopianRegionCode))}</text>`,
  )
  parts.push(
    `<text x="${x + padding + swatchSize * steps}" y="${labelY}" font-size="10" font-family="system-ui,-apple-system,sans-serif" fill="#475569" text-anchor="end">${escapeText(format(max, 'AA' as EthiopianRegionCode))}</text>`,
  )

  parts.push('</g>')
  return parts.join('')
}

// ────────────────────────────────────────────────────────────────
// Scale construction
// ────────────────────────────────────────────────────────────────

interface ScaleResult {
  /** The scale actually used to colour regions (may be quantized). */
  scale: (v: number) => string
  /** Underlying linear scale — used by the legend so swatches read smoothly. */
  linearScale: (v: number) => string
  min: number
  max: number
  hasRange: boolean
}

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
): ScaleResult {
  const vals = opts.values
    ? Object.values(opts.values).filter(
        (v): v is number => typeof v === 'number' && !Number.isNaN(v),
      )
    : []

  if (vals.length === 0) {
    return {
      scale: () => palette.min,
      linearScale: () => palette.min,
      min: 0,
      max: 0,
      hasRange: false,
    }
  }

  const min = opts.minValue ?? Math.min(...vals)
  const max = opts.maxValue ?? Math.max(...vals)

  if (min === max) {
    return {
      scale: () => palette.max,
      linearScale: () => palette.max,
      min,
      max,
      hasRange: false,
    }
  }

  const linearScale = makeLinearScale(palette, min, max)
  const steps = Math.max(1, Math.floor(opts.colorSteps ?? 1))
  const scale = steps === 1 ? linearScale : quantize(linearScale, steps, min, max)

  return { scale, linearScale, min, max, hasRange: true }
}

function makeLinearScale(
  palette: PaletteStops,
  min: number,
  max: number,
): (v: number) => string {
  if (palette.diverging && palette.mid) {
    const mid = (min + max) / 2
    return (v: number) => {
      if (v <= mid) {
        const t = (v - min) / (mid - min || 1)
        return lerpColor(palette.min, palette.mid as string, clamp01(t))
      }
      const t = (v - mid) / (max - mid || 1)
      return lerpColor(palette.mid as string, palette.max, clamp01(t))
    }
  }
  return (v: number) => {
    const t = (v - min) / (max - min)
    return lerpColor(palette.min, palette.max, clamp01(t))
  }
}

function quantize(
  linear: (v: number) => string,
  steps: number,
  min: number,
  max: number,
): (v: number) => string {
  return (v: number) => {
    const t = clamp01((v - min) / (max - min || 1))
    const bucket = Math.min(Math.floor(t * steps), steps - 1)
    // Sample the linear scale at the bucket midpoint so the chosen colour
    // visually represents the whole bucket.
    const sampleValue = min + ((bucket + 0.5) / steps) * (max - min)
    return linear(sampleValue)
  }
}

// ────────────────────────────────────────────────────────────────
// Colour helpers
// ────────────────────────────────────────────────────────────────

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
