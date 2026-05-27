/**
 * Live demo for the ethiopia-regions-map docs site.
 *
 * Loads the package from esm.sh's CDN so the demo always renders against
 * the latest published version — no rebuild needed when the package
 * updates. esm.sh transpiles the npm tarball to browser-native ESM.
 */
import {
  ETHIOPIAN_REGIONS,
  PALETTES,
  getEthiopianRegion,
  presets,
  renderEthiopiaMap,
} from 'https://esm.sh/ethiopia-regions-map'

// ───────────────────────────────────────────────────────────────
// Sample data — rough 2023 population estimates in millions, used
// as the default Mode so first-time visitors see meaningful colours
// rather than random noise.
// ───────────────────────────────────────────────────────────────
const POPULATION_MILLIONS = {
  OR: 41.7, AM: 21.1, SO: 6.5, TI: 5.4, SI: 4.5, SE: 9.5, CE: 9.8,
  SW: 1.9, AF: 1.8, GA: 0.5, BG: 1.1, HA: 0.2, AA: 3.6, DD: 0.5,
}

const codes = ETHIOPIAN_REGIONS.map((r) => r.code)
const $ = (sel) => document.querySelector(sel)

// ───────────────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────────────
const state = {
  palette: 'green',
  mode: 'population',
  showLabels: true,
  randomSeed: 0,
}

function randomValues() {
  const out = {}
  for (const c of codes) out[c] = Math.round(Math.random() * 100)
  return out
}

let randomCache = randomValues()

function currentValues() {
  if (state.mode === 'population') return POPULATION_MILLIONS
  if (state.mode === 'random') return randomCache
  return undefined // empty → outline only
}

// ───────────────────────────────────────────────────────────────
// Render — uses colorSteps + legend + valueFormat so visitors see
// the v0.2 features in action.
// ───────────────────────────────────────────────────────────────
function draw() {
  const values = currentValues()
  const svg = renderEthiopiaMap({
    values,
    palette: state.palette,
    showLabels: state.showLabels,
    width: 900,
    strokeWidth: state.mode === 'empty' ? 1.2 : 0.8,
    stroke: state.mode === 'empty' ? '#0f172a' : '#ffffff',
    defaultFill: '#f1f5f9',
    colorSteps: state.mode === 'population' ? 5 : 1,
    legend:
      state.mode === 'population'
        ? { title: 'Population (M)', position: 'bottom-right', format: (v) => v.toFixed(1) }
        : state.mode === 'random'
          ? { title: 'Sample value', position: 'bottom-right' }
          : false,
    valueFormat:
      state.mode === 'population'
        ? (v) => v.toFixed(1) + ' M'
        : (v) => String(v),
  })
  $('#map').innerHTML = svg
  $('#readout').textContent = labelForMode(state.mode)
}

function labelForMode(mode) {
  if (mode === 'population') return 'Showing 2023 population estimates (millions). Hover a region.'
  if (mode === 'random') return 'Random 0–100 values — click ↻ Reroll for a new set. Hover a region.'
  return 'No data — pure outline. Switch Mode to see a choropleth.'
}

// ───────────────────────────────────────────────────────────────
// Controls
// ───────────────────────────────────────────────────────────────
$('#palette').addEventListener('change', (e) => {
  state.palette = e.target.value
  draw()
})
$('#mode').addEventListener('change', (e) => {
  state.mode = e.target.value
  draw()
})
$('#labels').addEventListener('change', (e) => {
  state.showLabels = e.target.checked
  draw()
})
$('#reroll').addEventListener('click', () => {
  randomCache = randomValues()
  if (state.mode !== 'random') state.mode = 'random'
  $('#mode').value = 'random'
  draw()
})

// ───────────────────────────────────────────────────────────────
// Hover readout (event delegation on the map container)
// ───────────────────────────────────────────────────────────────
$('#map').addEventListener('mouseover', (e) => {
  const path = e.target.closest('.ethiopia-region')
  if (!path) return
  const region = getEthiopianRegion(path.dataset.code)
  const value = path.dataset.value
  const unit = state.mode === 'population' ? ' M people' : ''
  $('#readout').innerHTML = region
    ? `<strong>${escapeHtml(region.name)}</strong> (${path.dataset.code}, ${region.type}, capital ${escapeHtml(region.capital)}) — ${value != null ? value + unit : 'no data'}`
    : labelForMode(state.mode)
})
$('#map').addEventListener('mouseleave', () => {
  $('#readout').textContent = labelForMode(state.mode)
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// ───────────────────────────────────────────────────────────────
// Install command — copy button
// ───────────────────────────────────────────────────────────────
$('#copy-install').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('npm install ethiopia-regions-map')
    const btn = $('#copy-install')
    const orig = btn.textContent
    btn.textContent = 'Copied!'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = orig
      btn.classList.remove('copied')
    }, 1400)
  } catch {
    /* ignore — clipboard not available, no-op */
  }
})

// ───────────────────────────────────────────────────────────────
// Region table — built from the same data the package ships
// ───────────────────────────────────────────────────────────────
const tbody = $('#regions-tbody')
if (tbody) {
  tbody.innerHTML = ETHIOPIAN_REGIONS
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(
      (r) => `<tr>
        <td><code>${r.code}</code></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${r.type}</td>
        <td>${escapeHtml(r.capital)}</td>
        <td>${r.establishedYear}</td>
      </tr>`,
    )
    .join('')
}

// ───────────────────────────────────────────────────────────────
// Footer year
// ───────────────────────────────────────────────────────────────
const yearEl = $('#year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// ───────────────────────────────────────────────────────────────
// Palette gallery — render every built-in palette as a 6-stop strip
// using the package's own renderer.
// ───────────────────────────────────────────────────────────────
const paletteGallery = $('#palette-gallery')
if (paletteGallery && PALETTES) {
  paletteGallery.innerHTML = Object.entries(PALETTES)
    .map(([name, stops]) => {
      // Sample 6 stops by passing a tiny synthetic dataset
      const sample = { A1: 0, A2: 0.2, A3: 0.4, A4: 0.6, A5: 0.8, A6: 1 }
      // Use the package's lerp by abusing renderEthiopiaMap on a single region.
      // Simpler approach: hand-build a 6-step gradient strip using the same
      // PaletteStops the package uses, so we don't need to expose internals.
      const steps = stops.diverging && stops.mid
        ? [stops.min, lerpHex(stops.min, stops.mid, 0.5), stops.mid, lerpHex(stops.mid, stops.max, 0.5), stops.max]
        : [stops.min, lerpHex(stops.min, stops.max, 0.25), lerpHex(stops.min, stops.max, 0.5), lerpHex(stops.min, stops.max, 0.75), stops.max]
      void sample
      return `<div class="palette-card">
        <h4>${escapeHtml(name)} <code>palette: '${escapeHtml(name)}'</code></h4>
        <div class="palette-strip" aria-hidden="true">
          ${steps.map((c) => `<span style="background:${c}"></span>`).join('')}
        </div>
      </div>`
    })
    .join('')
}

// Minimal hex interpolation — duplicates package internals so this file
// stays self-contained without a build step.
function lerpHex(a, b, t) {
  const h2r = (h) => {
    const m = h.replace('#', '')
    const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
    const n = parseInt(f, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [ar, ag, ab] = h2r(a)
  const [br, bg, bb] = h2r(b)
  const mix = [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
    .map((n) => Math.round(n).toString(16).padStart(2, '0'))
    .join('')
  return '#' + mix
}

// ───────────────────────────────────────────────────────────────
// Presets gallery — render a mini-map per preset using the package
// itself, alongside the spread-code snippet.
// ───────────────────────────────────────────────────────────────
const presetsGallery = $('#presets-gallery')
if (presetsGallery && presets) {
  presetsGallery.innerHTML = Object.keys(presets)
    .map((name) => {
      const mini = renderEthiopiaMap({
        ...presets[name],
        values: POPULATION_MILLIONS,
        width: 320,
      })
      return `<div class="preset-card">
        <h4>${escapeHtml(name)}</h4>
        <div class="preset-mini">${mini}</div>
        <pre><code>renderEthiopiaMap({
  ...presets.${escapeHtml(name)},
  values: myData,
})</code></pre>
      </div>`
    })
    .join('')
}

// ───────────────────────────────────────────────────────────────
// First paint
// ───────────────────────────────────────────────────────────────
draw()
