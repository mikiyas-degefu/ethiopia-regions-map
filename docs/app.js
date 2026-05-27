/**
 * Live demo for the ethiopia-regions-map docs site.
 *
 * Loads the package from esm.sh's CDN so the demo always renders against
 * the latest published version — no rebuild needed when the package
 * updates. esm.sh transpiles the npm tarball to browser-native ESM.
 */
import {
  ETHIOPIAN_REGIONS,
  getEthiopianRegion,
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
// Render
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
// First paint
// ───────────────────────────────────────────────────────────────
draw()
