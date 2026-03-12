'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mountain,
  Factory,
  Wheat,
  Gem,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Navigation,
  Map as MapIcon,
  RefreshCw,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal
} from 'lucide-react'

// Types
interface City {
  name: string
  nameIt: string
  lng: number
  lat: number
  elevation: number
  zone: string
  x: number
  y: number
}

interface Region {
  name: string
  path: string
  fill: string
  stroke: string
  zone: string
}

interface MapData {
  regions: Region[]
  cities: City[]
  routePath: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  width: number
  height: number
  level?: 'regions' | 'provinces'
}

interface RouteCity {
  id: string
  name: string
  nameIt?: string
  lng: number
  lat: number
  elevation: number
  distance: number
}

interface TerrainSample {
  distance: number
  elevation: number
}

interface ElevationPoint {
  lat: number
  lng: number
  distance: number
}

interface GeocodeResult {
  name: string
  displayName?: string
  lat: number
  lng: number
  type?: string
  class?: string
  importance?: number
}

interface SegmentNotes {
  relief: string
  minerals: string
  agriculture: string
  industry: string
  highlights: string
}

// Route cities with coordinates and editable positions
const defaultRouteCities: RouteCity[] = [
  { id: 'turin', name: 'Турин', nameIt: 'Torino', lng: 7.6869, lat: 45.0703, elevation: 240, distance: 0 },
  { id: 'milan', name: 'Милан', nameIt: 'Milano', lng: 9.1900, lat: 45.4642, elevation: 120, distance: 140 },
  { id: 'venice', name: 'Венеция', nameIt: 'Venezia', lng: 12.3155, lat: 45.4408, elevation: 2, distance: 410 },
  { id: 'florence', name: 'Флоренция', nameIt: 'Firenze', lng: 11.2558, lat: 43.7696, elevation: 50, distance: 670 },
  { id: 'rome', name: 'Рим', nameIt: 'Roma', lng: 12.4964, lat: 41.9028, elevation: 20, distance: 950 },
  { id: 'naples', name: 'Неаполь', nameIt: 'Napoli', lng: 14.2681, lat: 40.8518, elevation: 17, distance: 1170 },
  { id: 'taranto', name: 'Таранто', nameIt: 'Taranto', lng: 17.2470, lat: 40.4644, elevation: 15, distance: 1430 }
]

// Секторы
const sectors = [
  { id: 'turin-milan', name: 'Турин — Милан', distance: '140 км', economicRegion: 'north',
    relief: 'Предгорья Западных Альп (240 м) → Паданская равнина (120 м)', 
    minerals: 'Строительные материалы (песок, гравий, глина)',
    agriculture: 'Мясо-молочное животноводство, пшеница, кукуруза, рис',
    industry: 'FIAT (автомобилестроение), аэрокосмос, шоколад (Ferrero)',
    highlights: ['FIAT', 'Ferrero', 'Аэрокосмос'] },
  { id: 'milan-venice', name: 'Милан — Венеция', distance: '270 км', economicRegion: 'north',
    relief: 'Паданская равнина (120→2 м), венецианская лагуна',
    minerals: 'Строительные материалы, природный газ',
    agriculture: 'Зерновые, овощи, фрукты, виноград',
    industry: 'Финансы, мода, химия (Милан); судостроение, стекло (Венеция)',
    highlights: ['Биржа', 'Мода', 'Мурано'] },
  { id: 'venice-florence', name: 'Венеция — Флоренция', distance: '260 км', economicRegion: 'north-central',
    relief: 'Тоскано-Эмилианские Апеннины: пер. Фута 903 м, г. Чимоне 2165 м',
    minerals: 'Каррарский мрамор (всемирно известный)',
    agriculture: 'Виноградарство, оливководство',
    industry: 'Кожевенное, текстиль, ювелирное дело',
    highlights: ['Мрамор', 'Кьянти', 'Кожа'] },
  { id: 'florence-rome', name: 'Флоренция — Рим', distance: '280 км', economicRegion: 'central',
    relief: 'Средние Апеннины: пер. 850 м, Корно-Гранде 2912 м (высш. Апеннин)',
    minerals: 'Туф, травертин, сера',
    agriculture: 'Виноград, оливки, овцеводство',
    industry: 'Туризм, кинопромышленность, пищевая',
    highlights: ['Колизей', 'Ватикан', 'Чинечитта'] },
  { id: 'rome-naples', name: 'Рим — Неаполь', distance: '220 км', economicRegion: 'south',
    relief: 'Южные Апеннины, вулкан Везувий 1281 м (действующий)',
    minerals: 'Сера, бокситы, вулканический пепел',
    agriculture: 'Цитрусовые, оливки, томаты Сан-Марцано',
    industry: 'Нефтепереработка, металлургия, судостроение',
    highlights: ['Везувий', 'Помпеи', 'Пицца'] },
  { id: 'naples-taranto', name: 'Неаполь — Таранто', distance: '260 км', economicRegion: 'south',
    relief: 'Монти-Дауни (до 1100 м), прибрежные равнины',
    minerals: 'Бокситы, природный газ',
    agriculture: 'Цитрусовые, оливки, овощи',
    industry: 'Металлургия ILVA (10 млн т/год), судостроение',
    highlights: ['ILVA', 'Верфь', 'Военная база'] }
]

// Экономические районы
const economicRegions = [
  { id: 'north', name: 'Северный район', color: 'from-emerald-500 to-teal-600', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500', cities: 'Турин — Милан — Венеция', description: '55% ВВП, промышленный центр' },
  { id: 'central', name: 'Центральный район', color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500', cities: 'Флоренция — Рим', description: '21% ВВП, туризм и культура' },
  { id: 'south', name: 'Южный район', color: 'from-rose-500 to-red-700', bgColor: 'bg-rose-500/20', borderColor: 'border-rose-500', cities: 'Неаполь — Таранто', description: '24% ВВП, аграрный регион' }
]

// Параметры профиля
const PROFILE_MAX_ELEVATION = 2000
const PROFILE_METERS_PER_CM = 200
const PROFILE_CM_PX = 38
const PROFILE_HEIGHT = Math.round((PROFILE_MAX_ELEVATION / PROFILE_METERS_PER_CM) * PROFILE_CM_PX)

const SCALE = {
  profileWidth: 1000,
  profileHeight: PROFILE_HEIGHT,
  leftPadding: 45,
  rightPadding: 15,
  bottomPadding: 70,
  topPadding: 35
}

const RELIEF_STEP_KM = 3
const MIN_RELIEF_STEP_KM = 2
const MAX_RELIEF_STEP_KM = 25
const MAX_ELEVATION_POINTS = 600

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const slugify = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned.length > 0 ? cleaned : `city-${Date.now()}`
}

const getViewBox = (zoom: number, pan: { x: number; y: number }, baseW: number, baseH: number) => {
  const safeZoom = Math.max(1, zoom)
  const viewW = baseW / safeZoom
  const viewH = baseH / safeZoom
  const maxX = Math.max(0, baseW - viewW)
  const maxY = Math.max(0, baseH - viewH)
  const x = clamp(pan.x, 0, maxX)
  const y = clamp(pan.y, 0, maxY)
  return { x, y, w: viewW, h: viewH }
}

const getNiceStep = (total: number) => {
  const targetTicks = 6
  const rough = total / Math.max(1, targetTicks - 1)
  const candidates = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000]
  return candidates.find(step => step >= rough) ?? Math.ceil(rough / 100) * 100
}

export default function ItalyProfile() {
  const [activeSector, setActiveSector] = useState<string | null>(null)
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(true)
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [routeCities, setRouteCities] = useState(defaultRouteCities)
  const [draggedCity, setDraggedCity] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [mapDetail, setMapDetail] = useState<'regions' | 'provinces'>('regions')
  const [terrainSamples, setTerrainSamples] = useState<TerrainSample[] | null>(null)
  const [reliefStatus, setReliefStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [needsReliefUpdate, setNeedsReliefUpdate] = useState(false)
  const [routeMode, setRouteMode] = useState<'default' | 'custom'>('default')
  const [reliefStepKm, setReliefStepKm] = useState(RELIEF_STEP_KM)
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<GeocodeResult[]>([])
  const [citySearchStatus, setCitySearchStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [citySearchError, setCitySearchError] = useState<string | null>(null)
  const [mapZoom, setMapZoom] = useState(1)
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 })
  const [mapPanMode, setMapPanMode] = useState(false)
  const [profileZoom, setProfileZoom] = useState(1)
  const [profilePan, setProfilePan] = useState({ x: 0, y: 0 })
  const [profilePanMode, setProfilePanMode] = useState(false)
  const [activeCustomSegment, setActiveCustomSegment] = useState<string | null>(null)
  const [customSegments, setCustomSegments] = useState<Record<string, SegmentNotes>>({})
  const routeDirtyRef = useRef(false)
  const mapPanRef = useRef<{
    startX: number
    startY: number
    panX: number
    panY: number
    rectW: number
    rectH: number
    baseW: number
    baseH: number
    zoom: number
  } | null>(null)
  const profilePanRef = useRef<{
    startX: number
    startY: number
    panX: number
    panY: number
    rectW: number
    rectH: number
    baseW: number
    baseH: number
    zoom: number
  } | null>(null)

  // Fetch map data
  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/map-data?level=${mapDetail}`)
      .then(res => res.json())
      .then(data => {
        setMapData(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to load map data:', err)
        setIsLoading(false)
      })
  }, [mapDetail])

  const totalWidth = SCALE.profileWidth + SCALE.leftPadding + SCALE.rightPadding
  const totalHeight = SCALE.profileHeight + SCALE.topPadding + SCALE.bottomPadding

  // Calculate distances between cities based on coordinates
  const citiesWithUpdatedDistances = useMemo(() => {
    let totalDistance = 0
    return routeCities.map((city, index) => {
      if (index === 0) {
        return { ...city, distance: 0 }
      }
      const prevCity = routeCities[index - 1]
      // Haversine formula for distance
      const R = 6371 // Earth's radius in km
      const dLat = (city.lat - prevCity.lat) * Math.PI / 180
      const dLon = (city.lng - prevCity.lng) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(prevCity.lat * Math.PI / 180) * Math.cos(city.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const distance = R * c
      totalDistance += distance
      return { ...city, distance: Math.round(totalDistance) }
    })
  }, [routeCities])

  const totalRouteDistance = citiesWithUpdatedDistances[citiesWithUpdatedDistances.length - 1]?.distance || 0

  const isDefaultRoute = routeMode === 'default'

  const minStepForLimit = totalRouteDistance > 0
    ? totalRouteDistance / Math.max(1, MAX_ELEVATION_POINTS - 1)
    : RELIEF_STEP_KM
  const effectiveReliefStepKm = Math.max(reliefStepKm, Math.ceil(minStepForLimit * 10) / 10)

  const distanceToX = (d: number) => {
    const denom = Math.max(1, totalRouteDistance || 1430)
    return SCALE.leftPadding + (d / denom) * SCALE.profileWidth
  }

  const distanceTicks = useMemo(() => {
    if (totalRouteDistance <= 0) return [0]
    const step = getNiceStep(totalRouteDistance)
    const ticks: number[] = []
    for (let d = 0; d <= totalRouteDistance + 0.01; d += step) {
      ticks.push(Math.round(d))
    }
    if (ticks[ticks.length - 1] < totalRouteDistance) {
      ticks.push(Math.round(totalRouteDistance))
    }
    return ticks
  }, [totalRouteDistance])

  const scaleBarKm = useMemo(() => {
    if (totalRouteDistance <= 0) return 100
    const base = totalRouteDistance / 6
    const rounded = Math.round(base / 10) * 10
    return Math.max(50, rounded)
  }, [totalRouteDistance])

  // Схематический профиль (fallback, если реальные высоты недоступны)
  const buildFallbackSamples = useCallback((): TerrainSample[] => {
    const samples: TerrainSample[] = []

    if (!isDefaultRoute) {
      const total = Math.max(totalRouteDistance, 1)
      const steps = Math.max(2, Math.round(total / 50))
      for (let i = 0; i <= steps; i++) {
        const d = (total * i) / steps
        samples.push({ distance: d, elevation: 0 })
      }
      return samples
    }

    // Турин - Милан
    for (let i = 0; i <= 14; i++) {
      const d = i * 10
      const e = Math.max(120, 240 - (i * 8.5))
      samples.push({ distance: d, elevation: e })
    }

    // Милан - Венеция
    for (let i = 0; i <= 27; i++) {
      const d = 140 + i * 10
      const e = Math.max(2, 120 - (i * 4.4))
      samples.push({ distance: d, elevation: e })
    }

    // Венеция - Флоренция
    for (let i = 0; i <= 26; i++) {
      const d = 410 + i * 10
      let e: number
      if (i < 8) e = Math.max(2, 2 + i * 12)
      else if (i < 17) e = Math.min(903, 100 + (i - 8) * 90)
      else if (i < 20) e = Math.max(200, 903 - (i - 17) * 100)
      else e = Math.max(50, 200 - (i - 20) * 75)
      samples.push({ distance: d, elevation: e })
    }

    // Флоренция - Рим
    for (let i = 0; i <= 28; i++) {
      const d = 670 + i * 10
      let e: number
      if (i < 5) e = Math.min(300, 50 + i * 50)
      else if (i < 10) e = Math.min(850, 300 + (i - 5) * 110)
      else if (i < 15) e = Math.max(200, 850 - (i - 10) * 130)
      else e = Math.max(20, 200 - (i - 15) * 18)
      samples.push({ distance: d, elevation: e })
    }

    // Рим - Неаполь
    for (let i = 0; i <= 22; i++) {
      const d = 950 + i * 10
      let e: number
      if (i < 5) e = Math.min(300, 20 + i * 56)
      else if (i < 10) e = Math.min(600, 300 + (i - 5) * 60)
      else if (i < 15) e = Math.max(50, 600 - (i - 10) * 110)
      else e = Math.max(17, 50 - (i - 15) * 6)
      samples.push({ distance: d, elevation: e })
    }

    // Неаполь - Таранто
    for (let i = 0; i <= 26; i++) {
      const d = 1170 + i * 10
      let e: number
      if (i < 5) e = Math.min(200, 17 + i * 36)
      else if (i < 12) e = Math.min(900, 200 + (i - 5) * 100)
      else if (i < 18) e = Math.max(100, 900 - (i - 12) * 133)
      else e = Math.max(15, 100 - (i - 18) * 17)
      samples.push({ distance: d, elevation: e })
    }

    return samples
  }, [isDefaultRoute, totalRouteDistance])

  const fallbackSamples = useMemo(() => buildFallbackSamples(), [buildFallbackSamples])
  const activeSamples = terrainSamples ?? fallbackSamples

  const elevationToY = (e: number) => {
    const clamped = clamp(e, 0, PROFILE_MAX_ELEVATION)
    return SCALE.topPadding + SCALE.profileHeight - (clamped / PROFILE_MAX_ELEVATION) * SCALE.profileHeight
  }

  const heightMarks = [0, 500, 1000, 1500, 2000]

  const terrainPoints = useMemo(() => {
    return activeSamples.map(sample => ({
      distance: sample.distance,
      elevation: sample.elevation,
      x: distanceToX(sample.distance),
      y: elevationToY(sample.elevation)
    }))
  }, [activeSamples, distanceToX, elevationToY])

  // Генерация пути рельефа
  const generateTerrainPath = () => {
    if (terrainPoints.length === 0) return ''
    let path = `M ${terrainPoints[0].x} ${SCALE.profileHeight + SCALE.topPadding}`
    path += ` L ${terrainPoints[0].x} ${terrainPoints[0].y}`

    for (let i = 0; i < terrainPoints.length - 1; i++) {
      const c = terrainPoints[i]
      const n = terrainPoints[i + 1]
      const mx = (c.x + n.x) / 2
      path += ` Q ${mx} ${c.y} ${n.x} ${n.y}`
    }

    path += ` L ${terrainPoints[terrainPoints.length - 1].x} ${SCALE.profileHeight + SCALE.topPadding} Z`
    return path
  }

  // Генерация пути для заливки сектора
  const generateSectorPath = (start: number, end: number) => {
    const pts = terrainPoints.filter(p => p.distance >= start && p.distance <= end)
    if (pts.length < 2) return ''

    let path = `M ${pts[0].x} ${SCALE.profileHeight + SCALE.topPadding}`
    path += ` L ${pts[0].x} ${pts[0].y}`

    for (let i = 0; i < pts.length - 1; i++) {
      const c = pts[i]
      const n = pts[i + 1]
      const mx = (c.x + n.x) / 2
      path += ` Q ${mx} ${c.y} ${n.x} ${n.y}`
    }

    path += ` L ${pts[pts.length - 1].x} ${SCALE.profileHeight + SCALE.topPadding} Z`
    return path
  }

  const sectorBounds = useMemo(() => {
    if (citiesWithUpdatedDistances.length < 2) return []
    return sectors
      .map((sector, idx) => {
        const startCity = citiesWithUpdatedDistances[idx]
        const endCity = citiesWithUpdatedDistances[idx + 1]
        if (!startCity || !endCity) return null
        return { id: sector.id, start: startCity.distance, end: endCity.distance }
      })
      .filter((item): item is { id: string; start: number; end: number } => Boolean(item))
  }, [citiesWithUpdatedDistances])

  const getGradient = (region: string) => {
    switch (region) {
      case 'north': return 'url(#northGrad)'
      case 'north-central': return 'url(#transitionGrad)'
      case 'central': return 'url(#centralGrad)'
      case 'south': return 'url(#southGrad)'
      default: return 'url(#northGrad)'
    }
  }

  // Handle drag on map
  const handleMapDrag = (cityId: string, e: React.MouseEvent<SVGCircleElement>) => {
    if (!mapData || mapPanMode) return
    e.stopPropagation()
    if (routeMode === 'default') {
      setRouteMode('custom')
      setActiveSector(null)
    }
    setDraggedCity(cityId)
    
    const svg = e.currentTarget.closest('svg')
    if (!svg) return
    
    const rect = svg.getBoundingClientRect()
    const viewBox = getViewBox(mapZoom, mapPan, mapData.width, mapData.height)
    const scaleX = viewBox.w / rect.width
    const scaleY = viewBox.h / rect.height
    
    const onMove = (moveEvent: MouseEvent) => {
      const x = viewBox.x + (moveEvent.clientX - rect.left) * scaleX
      const y = viewBox.y + (moveEvent.clientY - rect.top) * scaleY
      
      // Convert back to coordinates
      const { bounds, width, height } = mapData
      const padding = 20
      const scale = Math.min((width - 2 * padding) / (bounds.maxX - bounds.minX), (height - 2 * padding) / (bounds.maxY - bounds.minY))
      const offsetX = padding + (width - 2 * padding - (bounds.maxX - bounds.minX) * scale) / 2
      const offsetY = padding + (height - 2 * padding - (bounds.maxY - bounds.minY) * scale) / 2
      
      const lng = bounds.minX + (x - offsetX) / scale
      const lat = bounds.minY + (height - y - offsetY) / scale
      
      setRouteCities(prev => prev.map(city => 
        city.id === cityId ? { ...city, lng, lat } : city
      ))
    }
    
    const onUp = () => {
      setDraggedCity(null)
      setNeedsReliefUpdate(true)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleSearchCities = useCallback(async () => {
    const query = cityQuery.trim()
    if (query.length < 2) return
    setCitySearchStatus('loading')
    setCitySearchError(null)
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error(`Geocode error: ${response.status}`)
      }
      const data = await response.json()
      const results = Array.isArray(data?.results) ? data.results : []
      setCityResults(results)
      setCitySearchStatus('idle')
    } catch (error) {
      console.error('City search failed:', error)
      setCityResults([])
      setCitySearchStatus('error')
      setCitySearchError('Не удалось найти город. Попробуйте другой запрос.')
    }
  }, [cityQuery])

  const handleAddCity = useCallback((result: GeocodeResult) => {
    setRouteMode('custom')
    setActiveSector(null)
    setRouteCities(prev => [
      ...prev,
      {
        id: `${slugify(result.name)}-${Date.now().toString(36).slice(-4)}`,
        name: result.name,
        nameIt: result.name,
        lng: result.lng,
        lat: result.lat,
        elevation: 0,
        distance: 0
      }
    ])
    setCityQuery('')
    setCityResults([])
    setNeedsReliefUpdate(true)
  }, [])

  const handleRemoveCity = useCallback((id: string) => {
    setRouteMode('custom')
    setActiveSector(null)
    setRouteCities(prev => {
      if (prev.length <= 2) return prev
      return prev.filter(city => city.id !== id)
    })
    setNeedsReliefUpdate(true)
  }, [])

  const handleMoveCity = useCallback((index: number, direction: -1 | 1) => {
    setRouteMode('custom')
    setActiveSector(null)
    setRouteCities(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return next
    })
    setNeedsReliefUpdate(true)
  }, [])

  const handleResetRoute = useCallback(() => {
    setRouteMode('default')
    setActiveSector(null)
    setActiveCustomSegment(null)
    setRouteCities(defaultRouteCities)
    setNeedsReliefUpdate(true)
  }, [])

  const customSegmentList = useMemo(() => {
    if (citiesWithUpdatedDistances.length < 2) return []
    return citiesWithUpdatedDistances.slice(0, -1).map((city, index) => {
      const nextCity = citiesWithUpdatedDistances[index + 1]
      const id = `${city.id}-${nextCity.id}`
      const notes = customSegments[id] ?? {
        relief: '',
        minerals: '',
        agriculture: '',
        industry: '',
        highlights: ''
      }
      return {
        id,
        name: `${city.name} — ${nextCity.name}`,
        distance: Math.max(0, nextCity.distance - city.distance),
        ...notes
      }
    })
  }, [citiesWithUpdatedDistances, customSegments])

  const updateCustomSegment = useCallback((id: string, field: keyof SegmentNotes, value: string) => {
    setCustomSegments(prev => ({
      ...prev,
      [id]: {
        relief: prev[id]?.relief ?? '',
        minerals: prev[id]?.minerals ?? '',
        agriculture: prev[id]?.agriculture ?? '',
        industry: prev[id]?.industry ?? '',
        highlights: prev[id]?.highlights ?? '',
        ...prev[id],
        [field]: value
      }
    }))
  }, [])

  const getCityElevation = useCallback((city: RouteCity) => {
    if (!activeSamples || activeSamples.length === 0) return city.elevation
    let nearest = activeSamples[0]
    let minDelta = Math.abs(nearest.distance - city.distance)
    for (let i = 1; i < activeSamples.length; i++) {
      const sample = activeSamples[i]
      const delta = Math.abs(sample.distance - city.distance)
      if (delta < minDelta) {
        nearest = sample
        minDelta = delta
      }
    }
    return nearest.elevation
  }, [activeSamples])

  const buildSamplePoints = useCallback((stepKm: number) => {
    const points: ElevationPoint[] = []
    if (citiesWithUpdatedDistances.length < 2) return points

    for (let i = 0; i < citiesWithUpdatedDistances.length - 1; i++) {
      const start = citiesWithUpdatedDistances[i]
      const end = citiesWithUpdatedDistances[i + 1]
      const segmentDistance = Math.max(0, end.distance - start.distance)
      const steps = Math.max(1, Math.round(segmentDistance / stepKm))

      for (let s = 0; s <= steps; s++) {
        if (i > 0 && s === 0) continue
        const t = steps === 0 ? 0 : s / steps
        const lat = start.lat + (end.lat - start.lat) * t
        const lng = start.lng + (end.lng - start.lng) * t
        const distance = start.distance + segmentDistance * t
        points.push({ lat, lng, distance })
      }
    }

    return points
  }, [citiesWithUpdatedDistances])

  const fetchReliefProfile = useCallback(async () => {
    const points = buildSamplePoints(effectiveReliefStepKm)
    if (points.length === 0) return

    setReliefStatus('loading')
    try {
      const response = await fetch('/api/elevation-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      })
      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`)
      }
      const data = await response.json()
      const elevations: number[] = Array.isArray(data.elevations) ? data.elevations : []
      if (elevations.length !== points.length) {
        throw new Error('Elevation response size mismatch')
      }
      const samples = points.map((p, i) => ({
        distance: Number(p.distance.toFixed(1)),
        elevation: elevations[i] ?? 0
      }))
      setTerrainSamples(samples)
      setReliefStatus('ready')
      setNeedsReliefUpdate(false)
    } catch (error) {
      console.error('Failed to load elevation profile:', error)
      setReliefStatus('error')
      setTerrainSamples(null)
    }
  }, [buildSamplePoints, effectiveReliefStepKm])

  useEffect(() => {
    if (reliefStatus !== 'idle') return
    fetchReliefProfile()
  }, [fetchReliefProfile, reliefStatus])

  useEffect(() => {
    if (!routeDirtyRef.current) {
      routeDirtyRef.current = true
      return
    }
    setNeedsReliefUpdate(true)
  }, [routeCities, reliefStepKm, routeMode])

  const mapViewBox = useMemo(() => {
    if (!mapData) return { x: 0, y: 0, w: 0, h: 0 }
    return getViewBox(mapZoom, mapPan, mapData.width, mapData.height)
  }, [mapData, mapZoom, mapPan])

  const profileViewBox = useMemo(() => {
    return getViewBox(profileZoom, profilePan, totalWidth, totalHeight)
  }, [profileZoom, profilePan, totalWidth, totalHeight])

  const updateMapZoom = useCallback((nextZoom: number, anchor?: { x: number; y: number }) => {
    if (!mapData) return
    const clampedZoom = clamp(nextZoom, 1, 6)
    const baseW = mapData.width
    const baseH = mapData.height
    const currentView = getViewBox(mapZoom, mapPan, baseW, baseH)
    const anchorX = anchor?.x ?? currentView.x + currentView.w / 2
    const anchorY = anchor?.y ?? currentView.y + currentView.h / 2
    const nextW = baseW / clampedZoom
    const nextH = baseH / clampedZoom
    const nextX = anchorX - (anchorX - currentView.x) * (nextW / currentView.w)
    const nextY = anchorY - (anchorY - currentView.y) * (nextH / currentView.h)
    const maxX = Math.max(0, baseW - nextW)
    const maxY = Math.max(0, baseH - nextH)
    setMapZoom(clampedZoom)
    setMapPan({ x: clamp(nextX, 0, maxX), y: clamp(nextY, 0, maxY) })
  }, [mapData, mapZoom, mapPan])

  const updateProfileZoom = useCallback((nextZoom: number, anchor?: { x: number; y: number }) => {
    const clampedZoom = clamp(nextZoom, 1, 6)
    const baseW = totalWidth
    const baseH = totalHeight
    const currentView = getViewBox(profileZoom, profilePan, baseW, baseH)
    const anchorX = anchor?.x ?? currentView.x + currentView.w / 2
    const anchorY = anchor?.y ?? currentView.y + currentView.h / 2
    const nextW = baseW / clampedZoom
    const nextH = baseH / clampedZoom
    const nextX = anchorX - (anchorX - currentView.x) * (nextW / currentView.w)
    const nextY = anchorY - (anchorY - currentView.y) * (nextH / currentView.h)
    const maxX = Math.max(0, baseW - nextW)
    const maxY = Math.max(0, baseH - nextH)
    setProfileZoom(clampedZoom)
    setProfilePan({ x: clamp(nextX, 0, maxX), y: clamp(nextY, 0, maxY) })
  }, [profilePan, profileZoom, totalHeight, totalWidth])

  const handleMapWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    if (!mapData) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const view = getViewBox(mapZoom, mapPan, mapData.width, mapData.height)
    const pointerX = view.x + ((event.clientX - rect.left) / rect.width) * view.w
    const pointerY = view.y + ((event.clientY - rect.top) / rect.height) * view.h
    const factor = event.deltaY < 0 ? 1.12 : 0.9
    updateMapZoom(mapZoom * factor, { x: pointerX, y: pointerY })
  }, [mapData, mapZoom, mapPan, updateMapZoom])

  const handleProfileWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const view = getViewBox(profileZoom, profilePan, totalWidth, totalHeight)
    const pointerX = view.x + ((event.clientX - rect.left) / rect.width) * view.w
    const pointerY = view.y + ((event.clientY - rect.top) / rect.height) * view.h
    const factor = event.deltaY < 0 ? 1.12 : 0.9
    updateProfileZoom(profileZoom * factor, { x: pointerX, y: pointerY })
  }, [profileZoom, profilePan, totalWidth, totalHeight, updateProfileZoom])

  const handleMapPanStart = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!mapData || !mapPanMode) return
    const target = event.target as Element | null
    if (target && target.tagName !== 'svg' && target.tagName !== 'rect') return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    mapPanRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: mapPan.x,
      panY: mapPan.y,
      rectW: rect.width,
      rectH: rect.height,
      baseW: mapData.width,
      baseH: mapData.height,
      zoom: mapZoom
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const state = mapPanRef.current
      if (!state) return
      const viewW = state.baseW / state.zoom
      const viewH = state.baseH / state.zoom
      const dx = moveEvent.clientX - state.startX
      const dy = moveEvent.clientY - state.startY
      const nextX = state.panX - dx * (viewW / state.rectW)
      const nextY = state.panY - dy * (viewH / state.rectH)
      const maxX = Math.max(0, state.baseW - viewW)
      const maxY = Math.max(0, state.baseH - viewH)
      setMapPan({ x: clamp(nextX, 0, maxX), y: clamp(nextY, 0, maxY) })
    }

    const handleUp = () => {
      mapPanRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [mapData, mapPanMode, mapPan, mapZoom])

  const handleProfilePanStart = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!profilePanMode) return
    const target = event.target as Element | null
    if (target && target.tagName !== 'svg' && target.tagName !== 'rect') return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    profilePanRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: profilePan.x,
      panY: profilePan.y,
      rectW: rect.width,
      rectH: rect.height,
      baseW: totalWidth,
      baseH: totalHeight,
      zoom: profileZoom
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const state = profilePanRef.current
      if (!state) return
      const viewW = state.baseW / state.zoom
      const viewH = state.baseH / state.zoom
      const dx = moveEvent.clientX - state.startX
      const dy = moveEvent.clientY - state.startY
      const nextX = state.panX - dx * (viewW / state.rectW)
      const nextY = state.panY - dy * (viewH / state.rectH)
      const maxX = Math.max(0, state.baseW - viewW)
      const maxY = Math.max(0, state.baseH - viewH)
      setProfilePan({ x: clamp(nextX, 0, maxX), y: clamp(nextY, 0, maxY) })
    }

    const handleUp = () => {
      profilePanRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [profilePanMode, profilePan, profileZoom, totalHeight, totalWidth])

  // Generate route path for map
  const generateMapRoutePath = () => {
    if (!mapData) return ''
    
    const { bounds, width, height } = mapData
    const padding = 20
    const scale = Math.min((width - 2 * padding) / (bounds.maxX - bounds.minX), (height - 2 * padding) / (bounds.maxY - bounds.minY))
    const offsetX = padding + (width - 2 * padding - (bounds.maxX - bounds.minX) * scale) / 2
    const offsetY = padding + (height - 2 * padding - (bounds.maxY - bounds.minY) * scale) / 2
    
    return citiesWithUpdatedDistances.map((city, i) => {
      const x = offsetX + (city.lng - bounds.minX) * scale
      const y = height - offsetY - (city.lat - bounds.minY) * scale
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }

  // Get projected city positions for map
  const getProjectedCities = () => {
    if (!mapData) return []
    
    const { bounds, width, height } = mapData
    const padding = 20
    const scale = Math.min((width - 2 * padding) / (bounds.maxX - bounds.minX), (height - 2 * padding) / (bounds.maxY - bounds.minY))
    const offsetX = padding + (width - 2 * padding - (bounds.maxX - bounds.minX) * scale) / 2
    const offsetY = padding + (height - 2 * padding - (bounds.maxY - bounds.minY) * scale) / 2
    
    return citiesWithUpdatedDistances.map(city => {
      const x = offsetX + (city.lng - bounds.minX) * scale
      const y = height - offsetY - (city.lat - bounds.minY) * scale
      return { ...city, x, y }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/90 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <Mountain className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 bg-clip-text text-transparent">
                  Географический профиль Италии
                </h1>
                <p className="text-[10px] text-slate-400">
                  Турин — Милан — Венеция — Флоренция — Рим — Неаполь — Таранто
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-1"
              >
                <MapIcon className="w-3 h-3" />
                {showMap ? 'Скрыть карту' : 'Показать карту'}
              </button>
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-1"
              >
                <Layers className="w-3 h-3" />
                Легенда
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Main content with map and profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Map Section */}
          {showMap && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800 rounded-xl border border-slate-600 overflow-hidden"
            >
              <div className="p-2 border-b border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <MapIcon className="w-4 h-4 text-emerald-400" />
                  Физическая карта Италии
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    {mapPanMode ? 'Панорама карты' : 'Перетащите точки маршрута'}
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-slate-700/60 p-0.5 text-[10px]">
                    <button
                      onClick={() => updateMapZoom(mapZoom / 1.15)}
                      className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                      title="Отдалить"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span className="px-1 text-[9px] text-slate-300">{Math.round(mapZoom * 100)}%</span>
                    <button
                      onClick={() => updateMapZoom(mapZoom * 1.15)}
                      className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                      title="Приблизить"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }) }}
                      className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                      title="Сбросить"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setMapPanMode(!mapPanMode)}
                      className={`px-2 py-0.5 rounded ${
                        mapPanMode ? 'bg-emerald-500/30 text-emerald-200' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Пан
                    </button>
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-slate-700/60 p-0.5 text-[10px]">
                    <button
                      onClick={() => setMapDetail('regions')}
                      className={`px-2 py-0.5 rounded ${
                        mapDetail === 'regions'
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Регионы
                    </button>
                    <button
                      onClick={() => setMapDetail('provinces')}
                      className={`px-2 py-0.5 rounded ${
                        mapDetail === 'provinces'
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Провинции
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                  </div>
                ) : mapData ? (
                  <svg
                    viewBox={`${mapViewBox.x} ${mapViewBox.y} ${mapViewBox.w} ${mapViewBox.h}`}
                    className={`w-full h-auto max-h-[400px] ${mapPanMode ? 'cursor-grab' : ''}`}
                    preserveAspectRatio="xMidYMid meet"
                    onWheel={handleMapWheel}
                    onMouseDown={handleMapPanStart}
                    style={{ touchAction: 'none' }}
                  >
                    <defs>
                      <linearGradient id="mapBg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a5f" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Background */}
                    <rect x="0" y="0" width={mapData.width} height={mapData.height} fill="url(#mapBg)" />
                    
                    {/* Regions */}
                    {mapData.regions.map((region, idx) => (
                      <path
                        key={idx}
                        d={region.path}
                        fill={region.fill}
                        fillOpacity={mapDetail === 'provinces' ? 0.25 : 0.4}
                        stroke={region.stroke}
                        strokeWidth={mapDetail === 'provinces' ? 0.25 : 0.5}
                        className="hover:fill-opacity-60 transition-all"
                      />
                    ))}
                    
                    {/* Route line */}
                    <path
                      d={generateMapRoutePath()}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      strokeDasharray="5,3"
                      filter="url(#glow)"
                    />
                    
                    {/* City points */}
                    {getProjectedCities().map((city, idx) => (
                      <g key={city.id}>
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r={draggedCity === city.id ? 10 : 7}
                          fill={draggedCity === city.id ? '#fbbf24' : '#fff'}
                          stroke="#1e293b"
                          strokeWidth={2}
                          className={`${mapPanMode ? 'cursor-not-allowed' : 'cursor-move hover:scale-125'} transition-transform`}
                          onMouseDown={(e) => handleMapDrag(city.id, e)}
                        />
                        <text
                          x={city.x}
                          y={city.y - 12}
                          fill="#fff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          style={{ textShadow: '0 0 3px rgba(0, 0, 0, 0.8)' }}
                        >
                          {city.name}
                        </text>
                        <text
                          x={city.x}
                          y={city.y + 18}
                          fill="rgba(255, 255, 255, 0.6)"
                          fontSize="7"
                          textAnchor="middle"
                        >
                          {city.distance} км
                        </text>
                      </g>
                    ))}
                  </svg>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    Не удалось загрузить карту
                  </div>
                )}
              </div>
              
              {/* Map legend */}
              <div className="px-3 pb-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 border-t border-slate-600 pt-2">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  Север
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                  Центр
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                  Юг
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500"></span>
                  Острова
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <span className="w-4 h-0.5 bg-yellow-400"></span>
                  Маршрут
                </span>
              </div>
            </motion.div>
          )}
          
          {/* Profile Section */}
          <div className="bg-slate-800 rounded-xl border border-slate-600 overflow-hidden">
            <div className="p-2 border-b border-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Mountain className="w-4 h-4 text-emerald-400" />
                Высотный профиль рельефа
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  Шаг: {effectiveReliefStepKm} км
                  {effectiveReliefStepKm !== reliefStepKm && (
                    <span className="text-amber-300">(ограничен)</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  Верт. масштаб: 1 см = 200 м (0–2000 м)
                </div>
                <div className="flex items-center gap-1 rounded-md bg-slate-700/60 p-0.5 text-[10px]">
                  <button
                    onClick={() => updateProfileZoom(profileZoom / 1.15)}
                    className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                    title="Отдалить"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="px-1 text-[9px] text-slate-300">{Math.round(profileZoom * 100)}%</span>
                  <button
                    onClick={() => updateProfileZoom(profileZoom * 1.15)}
                    className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                    title="Приблизить"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setProfileZoom(1); setProfilePan({ x: 0, y: 0 }) }}
                    className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                    title="Сбросить"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setProfilePanMode(!profilePanMode)}
                    className={`px-2 py-0.5 rounded ${
                      profilePanMode ? 'bg-emerald-500/30 text-emerald-200' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Пан
                  </button>
                </div>
                <button
                  onClick={() => fetchReliefProfile()}
                  disabled={reliefStatus === 'loading'}
                  className={`ml-1 px-2 py-1 rounded-lg flex items-center gap-1 ${
                    reliefStatus === 'loading'
                      ? 'bg-slate-700/60 text-slate-300'
                      : needsReliefUpdate
                        ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${reliefStatus === 'loading' ? 'animate-spin' : ''}`} />
                  {reliefStatus === 'loading' ? 'Обновление...' : 'Обновить рельеф'}
                </button>
              </div>
            </div>

            {/* SVG Profile */}
            <div className="p-2">
              {reliefStatus === 'error' && (
                <div className="mb-2 rounded-md border border-rose-800/50 bg-rose-900/30 px-2 py-1 text-[10px] text-rose-200">
                  Не удалось загрузить реальные высоты. Показан схематический профиль.
                </div>
              )}
              <svg
                viewBox={`${profileViewBox.x} ${profileViewBox.y} ${profileViewBox.w} ${profileViewBox.h}`}
                className={`w-full h-auto ${profilePanMode ? 'cursor-grab' : ''}`}
                preserveAspectRatio="xMidYMid meet"
                onWheel={handleProfileWheel}
                onMouseDown={handleProfilePanStart}
                style={{ touchAction: 'none' }}
              >
                <defs>
                  <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#2d4a6f" />
                  </linearGradient>
                  <linearGradient id="northGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="centralGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="southGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="transitionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Фон */}
                <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="url(#skyGrad)" />

                {/* Горизонтальные линии высот */}
                {heightMarks.map(h => (
                  <line
                    key={h}
                    x1={SCALE.leftPadding}
                    y1={elevationToY(h)}
                    x2={totalWidth - SCALE.rightPadding}
                    y2={elevationToY(h)}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Подписи высот на шкале */}
                {heightMarks.map(h => (
                  <text
                    key={h}
                    x="8"
                    y={elevationToY(h) + 3}
                    fill="rgba(255, 255, 255, 0.5)"
                    fontSize="8"
                  >
                    {h} м
                  </text>
                ))}

                {/* Секторы */}
                {isDefaultRoute ? (
                  sectorBounds.map(bound => {
                    const sector = sectors.find(s => s.id === bound.id)!
                    const isHovered = hoveredSector === bound.id
                    const isActive = activeSector === bound.id
                    return (
                      <path
                        key={bound.id}
                        d={generateSectorPath(bound.start, bound.end)}
                        fill={getGradient(sector.economicRegion)}
                        opacity={isHovered || isActive ? 1 : 0.75}
                        stroke={isHovered || isActive ? '#fff' : 'transparent'}
                        strokeWidth={isHovered || isActive ? 1.5 : 0}
                        className="cursor-pointer transition-all"
                        onClick={() => setActiveSector(isActive ? null : bound.id)}
                        onMouseEnter={() => setHoveredSector(bound.id)}
                        onMouseLeave={() => setHoveredSector(null)}
                      />
                    )
                  })
                ) : (
                  <path
                    d={generateTerrainPath()}
                    fill="url(#transitionGrad)"
                    opacity="0.8"
                  />
                )}

                {/* Контур рельефа */}
                <path d={generateTerrainPath()} fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />

                {/* Орографические объекты удалены по запросу */}

                {/* Города */}
                {citiesWithUpdatedDistances.map(city => {
                  const elevation = getCityElevation(city)
                  const x = distanceToX(city.distance)
                  const y = elevationToY(elevation)
                  return (
                    <g key={city.id}>
                      <line x1={x} y1={y} x2={x} y2={SCALE.profileHeight + SCALE.topPadding} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="2,2" />
                      <circle cx={x} cy={y} r="4" fill="#fff" stroke="#1e293b" strokeWidth="2" />
                      <text x={x} y={y - 10} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 0 3px rgba(0, 0, 0, 0.8)' }}>
                        {city.name}
                      </text>
                    </g>
                  )
                })}

                {/* Шкала расстояний */}
                <g fontSize="7" fill="rgba(255, 255, 255, 0.45)" textAnchor="middle">
                  {distanceTicks.map(km => (
                    <g key={km}>
                      <line x1={distanceToX(km)} y1={SCALE.profileHeight + SCALE.topPadding + 32} x2={distanceToX(km)} y2={SCALE.profileHeight + SCALE.topPadding + 37} stroke="rgba(255, 255, 255, 0.3)" />
                      <text x={distanceToX(km)} y={SCALE.profileHeight + SCALE.topPadding + 46}>{km} км</text>
                    </g>
                  ))}
                </g>

                {/* Масштабная линейка */}
                <g transform={`translate(${totalWidth - (distanceToX(scaleBarKm) - distanceToX(0)) - 20}, ${SCALE.profileHeight + SCALE.topPadding + 52})`}>
                  <rect x="0" y="0" width={distanceToX(scaleBarKm) - distanceToX(0)} height="5" fill="none" stroke="rgba(255, 255, 255, 0.4)" />
                  <rect x="0" y="0" width={(distanceToX(scaleBarKm) - distanceToX(0)) / 2} height="5" fill="rgba(255, 255, 255, 0.25)" />
                  <text x="0" y="14" fontSize="6" fill="rgba(255, 255, 255, 0.4)">0</text>
                  <text x={(distanceToX(scaleBarKm) - distanceToX(0)) / 2} y="14" fontSize="6" fill="rgba(255, 255, 255, 0.4)" textAnchor="middle">
                    {Math.round(scaleBarKm / 2)} км
                  </text>
                  <text x={distanceToX(scaleBarKm) - distanceToX(0)} y="14" fontSize="6" fill="rgba(255, 255, 255, 0.4)" textAnchor="end">
                    {Math.round(scaleBarKm)} км
                  </text>
                </g>
              </svg>
            </div>

            {/* Цветовая легенда профиля */}
            {isDefaultRoute ? (
              <div className="px-3 pb-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  Север
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                  Переход
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                  Центр
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                  Юг
                </span>
              </div>
            ) : (
              <div className="px-3 pb-2 text-[10px] text-slate-400">
                Пользовательский маршрут: заполните заметки по сегментам для собственной аналитики.
              </div>
            )}
          </div>
        </div>

        {/* Маршрут и точность */}
        <div className="mb-4 p-3 bg-slate-800/70 rounded-xl border border-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Navigation className="w-4 h-4 text-emerald-400" />
              Маршрут и точность профиля
            </div>
            <div className="flex items-center gap-1 rounded-md bg-slate-700/60 p-0.5 text-[10px]">
              <button
                onClick={handleResetRoute}
                className={`px-2 py-0.5 rounded ${
                  routeMode === 'default'
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Учебный
              </button>
              <button
                onClick={() => setRouteMode('custom')}
                className={`px-2 py-0.5 rounded ${
                  routeMode === 'custom'
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Произвольный
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-slate-300">Города маршрута</div>
                <div className="text-[9px] text-slate-500">
                  {routeMode === 'custom' ? 'Редактируемый' : 'Учебный маршрут'}
                </div>
              </div>
              <div className="space-y-1">
                {routeCities.map((city, index) => (
                  <div key={city.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-800/60 px-2 py-1">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-100 truncate">{city.name}</div>
                      <div className="text-[9px] text-slate-400">
                        {citiesWithUpdatedDistances[index]?.distance ?? 0} км • {city.lat.toFixed(3)}, {city.lng.toFixed(3)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveCity(index, -1)}
                        className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white disabled:opacity-40"
                        disabled={index === 0}
                        title="Сдвинуть вверх"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveCity(index, 1)}
                        className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white disabled:opacity-40"
                        disabled={index === routeCities.length - 1}
                        title="Сдвинуть вниз"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveCity(city.id)}
                        className="px-1.5 py-0.5 rounded text-rose-300 hover:text-rose-200 disabled:opacity-40"
                        disabled={routeCities.length <= 2}
                        title="Удалить город"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-slate-500">
                Перетаскивание точек на карте или редактирование списка автоматически включает произвольный маршрут.
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
                <div className="text-[11px] font-semibold text-slate-300 mb-2">Добавить город Италии</div>
                <div className="flex items-center gap-2">
                  <input
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchCities()
                      }
                    }}
                    placeholder="Например: Bologna, Bari, Genova"
                    className="flex-1 rounded-md border border-slate-600 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={handleSearchCities}
                    disabled={citySearchStatus === 'loading' || cityQuery.trim().length < 2}
                    className="px-2 py-1 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1 text-[10px]"
                  >
                    <Search className="w-3 h-3" />
                    Найти
                  </button>
                </div>
                {citySearchStatus === 'error' && (
                  <div className="mt-2 text-[9px] text-rose-300">{citySearchError}</div>
                )}
                {cityResults.length > 0 && (
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-md border border-slate-700 bg-slate-900/40 p-1">
                    {cityResults.map((result, idx) => (
                      <button
                        key={`${result.name}-${idx}`}
                        onClick={() => handleAddCity(result)}
                        className="w-full text-left rounded-md px-2 py-1 hover:bg-slate-700/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-100">{result.name}</span>
                          <span className="text-[9px] text-emerald-300 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> добавить
                          </span>
                        </div>
                        {result.displayName && (
                          <div className="text-[9px] text-slate-400 truncate">{result.displayName}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-[9px] text-slate-500">
                  Поиск выполняется через OpenStreetMap (Nominatim), только по Италии.
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    Точность рельефа
                  </div>
                  <div className="text-[10px] text-slate-400">{effectiveReliefStepKm} км</div>
                </div>
                <input
                  type="range"
                  min={MIN_RELIEF_STEP_KM}
                  max={MAX_RELIEF_STEP_KM}
                  step={1}
                  value={reliefStepKm}
                  onChange={(e) => setReliefStepKm(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
                {effectiveReliefStepKm !== reliefStepKm && (
                  <div className="mt-1 text-[9px] text-amber-300">
                    Шаг увеличен до {effectiveReliefStepKm} км из-за лимита {MAX_ELEVATION_POINTS} точек.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Легенда районов */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-slate-800/80 rounded-xl border border-slate-600 p-3">
                <h3 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Экономические районы Италии
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {economicRegions.map(r => (
                    <div key={r.id} className={`p-2 rounded-lg ${r.bgColor} border ${r.borderColor}`}>
                      <div className={`text-xs font-bold bg-gradient-to-r ${r.color} bg-clip-text text-transparent`}>{r.name}</div>
                      <div className="text-[10px] text-slate-300">{r.cities}</div>
                      <div className="text-[9px] text-slate-400">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Информация о маршруте */}
        <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-600 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
            <Navigation className="w-4 h-4" />
            Информация о маршруте
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center px-2 py-1 bg-slate-700 rounded">
              <div className="text-base font-bold text-emerald-400">{Math.round(totalRouteDistance || 0)}</div>
              <div className="text-[9px] text-slate-400">км (общее расстояние)</div>
            </div>
            <div className="text-center px-2 py-1 bg-slate-700 rounded">
              <div className="text-base font-bold text-amber-400">{((totalRouteDistance || 0) / 45).toFixed(1)}</div>
              <div className="text-[9px] text-slate-400">см (в масштабе 1:45)</div>
            </div>
            <div className="text-center px-2 py-1 bg-slate-700 rounded">
              <div className="text-base font-bold text-rose-400">{routeCities.length}</div>
              <div className="text-[9px] text-slate-400">городов</div>
            </div>
            <div className="text-center px-2 py-1 bg-slate-700 rounded">
              <div className="text-base font-bold text-violet-400">{isDefaultRoute ? sectors.length : Math.max(0, routeCities.length - 1)}</div>
              <div className="text-[9px] text-slate-400">{isDefaultRoute ? 'секторов' : 'сегментов'}</div>
            </div>
          </div>
        </div>

        {/* Карточки секторов или пользовательская аналитика */}
        {isDefaultRoute ? (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              Информация по секторам
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sectors.map((sector, idx) => {
                const isExpanded = activeSector === sector.id
                let borderClr = 'border-emerald-500/40 hover:border-emerald-500/70'
                let bgClr = 'from-emerald-600/20 to-teal-600/10'
                if (sector.economicRegion === 'north-central') { borderClr = 'border-blue-500/40 hover:border-blue-500/70'; bgClr = 'from-blue-600/20 to-indigo-600/10' }
                else if (sector.economicRegion === 'central') { borderClr = 'border-amber-500/40 hover:border-amber-500/70'; bgClr = 'from-amber-600/20 to-orange-600/10' }
                else if (sector.economicRegion === 'south') { borderClr = 'border-rose-500/40 hover:border-rose-500/70'; bgClr = 'from-rose-600/20 to-red-600/10' }

                return (
                  <motion.div
                    key={sector.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * idx }}
                    onClick={() => setActiveSector(isExpanded ? null : sector.id)}
                    className={`cursor-pointer rounded-lg border transition-all bg-slate-800/60 ${isExpanded ? borderClr : 'border-slate-600 hover:border-slate-500'}`}
                  >
                    <div className={`p-2 rounded-t-lg bg-gradient-to-r ${bgClr}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-xs">{sector.name}</h4>
                          <p className="text-[10px] text-slate-300">{sector.distance}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="p-2 space-y-1 text-[10px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mountain className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{sector.relief.split('→')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Factory className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{sector.industry.split(',')[0]}</span>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="p-2 pt-0 space-y-2 border-t border-slate-600 text-[10px]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="pt-2">
                              <div className="flex items-center gap-1 text-emerald-400 font-semibold"><Mountain className="w-3 h-3" />Рельеф</div>
                              <p className="text-slate-300">{sector.relief}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-amber-400 font-semibold"><Gem className="w-3 h-3" />Ископаемые</div>
                              <p className="text-slate-300">{sector.minerals}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-green-400 font-semibold"><Wheat className="w-3 h-3" />С/х</div>
                              <p className="text-slate-300">{sector.agriculture}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-rose-400 font-semibold"><Factory className="w-3 h-3" />Промышленность</div>
                              <p className="text-slate-300">{sector.industry}</p>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {sector.highlights.map((h, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-700 rounded text-[9px]">{h}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              Сегменты маршрута (для собственной аналитики)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {customSegmentList.map((segment, idx) => {
                const isExpanded = activeCustomSegment === segment.id
                return (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * idx }}
                    onClick={() => setActiveCustomSegment(isExpanded ? null : segment.id)}
                    className={`cursor-pointer rounded-lg border transition-all bg-slate-800/60 ${isExpanded ? 'border-amber-500/70' : 'border-slate-600 hover:border-slate-500'}`}
                  >
                    <div className="p-2 rounded-t-lg bg-gradient-to-r from-amber-600/20 to-orange-600/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-xs">{segment.name}</h4>
                          <p className="text-[10px] text-slate-300">{segment.distance} км</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="p-2 space-y-1 text-[10px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mountain className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{segment.relief || 'Добавьте заметки о рельефе'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Factory className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{segment.industry || 'Добавьте заметки о промышленности'}</span>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-2 pt-0 space-y-2 border-t border-slate-600 text-[10px]">
                            <div className="pt-2">
                              <div className="flex items-center gap-1 text-emerald-400 font-semibold"><Mountain className="w-3 h-3" />Рельеф</div>
                              <textarea
                                value={segment.relief}
                                onChange={(e) => updateCustomSegment(segment.id, 'relief', e.target.value)}
                                placeholder="Горы, равнины, переходы"
                                rows={2}
                                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-amber-400 font-semibold"><Gem className="w-3 h-3" />Ископаемые</div>
                              <textarea
                                value={segment.minerals}
                                onChange={(e) => updateCustomSegment(segment.id, 'minerals', e.target.value)}
                                placeholder="Полезные ископаемые, ресурсы"
                                rows={2}
                                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-green-400 font-semibold"><Wheat className="w-3 h-3" />С/х</div>
                              <textarea
                                value={segment.agriculture}
                                onChange={(e) => updateCustomSegment(segment.id, 'agriculture', e.target.value)}
                                placeholder="Сельское хозяйство, культуры"
                                rows={2}
                                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-rose-400 font-semibold"><Factory className="w-3 h-3" />Промышленность</div>
                              <textarea
                                value={segment.industry}
                                onChange={(e) => updateCustomSegment(segment.id, 'industry', e.target.value)}
                                placeholder="Промышленность, сервисы, туризм"
                                rows={2}
                                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-sky-300 font-semibold"><MapPin className="w-3 h-3" />Ключевые метки</div>
                              <input
                                value={segment.highlights}
                                onChange={(e) => updateCustomSegment(segment.id, 'highlights', e.target.value)}
                                placeholder="Теги через запятую"
                                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
