/**
 * React example — not bundled. Shows how to render the 14 regions as a
 * proper React component instead of an HTML string (so you keep event
 * handlers + virtual DOM diffing).
 */
import { useState } from 'react'
import {
  ETHIOPIA_GEOMETRY,
  ETHIOPIA_RENDER_ORDER,
  ETHIOPIA_VIEWBOX,
  ETHIOPIAN_REGIONS,
  getEthiopianRegion,
  type EthiopianRegionCode,
} from 'ethiopia-regions-map'

interface Props {
  values?: Partial<Record<EthiopianRegionCode, number>>
  onRegionClick?: (code: EthiopianRegionCode) => void
}

export function EthiopiaMap({ values = {}, onRegionClick }: Props) {
  const [hovered, setHovered] = useState<EthiopianRegionCode | null>(null)
  const vals = Object.values(values).filter((v): v is number => typeof v === 'number')
  const min = vals.length ? Math.min(...vals) : 0
  const max = vals.length ? Math.max(...vals) : 1

  const color = (v: number | undefined) => {
    if (v == null) return '#f3f4f6'
    const t = max === min ? 1 : (v - min) / (max - min)
    const r = Math.round(220 - t * 180)
    const g = Math.round(252 - t * 130)
    const b = Math.round(231 - t * 186)
    return `rgb(${r},${g},${b})`
  }

  return (
    <svg
      viewBox={`0 0 ${ETHIOPIA_VIEWBOX.width} ${ETHIOPIA_VIEWBOX.height}`}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label="Ethiopia 14-region administrative map"
    >
      {ETHIOPIA_RENDER_ORDER.map((code) => {
        const region = getEthiopianRegion(code)!
        return (
          <path
            key={code}
            d={ETHIOPIA_GEOMETRY[code].d}
            fill={color(values[code])}
            stroke={hovered === code ? '#0f172a' : '#ffffff'}
            strokeWidth={hovered === code ? 1.6 : 0.8}
            strokeLinejoin="round"
            onMouseEnter={() => setHovered(code)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onRegionClick?.(code)}
            style={{ cursor: 'pointer' }}
          >
            <title>
              {region.name} {values[code] != null ? `— ${values[code]}` : ''}
            </title>
          </path>
        )
      })}
      {ETHIOPIAN_REGIONS.map((r) => {
        const [cx, cy] = ETHIOPIA_GEOMETRY[r.code].centroid
        return (
          <text
            key={r.code}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={500}
            fill="#111827"
            pointerEvents="none"
          >
            {r.code}
          </text>
        )
      })}
    </svg>
  )
}
