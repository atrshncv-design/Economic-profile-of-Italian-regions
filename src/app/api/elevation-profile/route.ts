import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

type ElevationPoint = {
  lat: number
  lng: number
  distance: number
}

const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'
const BATCH_SIZE = 100
const MAX_POINTS = 600
const BATCH_DELAY_MS = 400

const cache = new Map<string, number[]>()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const buildCacheKey = (points: ElevationPoint[]) => {
  const normalized = points.map(p => ({
    lat: Number(p.lat.toFixed(5)),
    lng: Number(p.lng.toFixed(5)),
    distance: Number(p.distance.toFixed(2))
  }))
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

const fetchBatch = async (batch: ElevationPoint[]) => {
  const locations = batch.map(p => `${p.lat},${p.lng}`).join('|')
  const response = await fetch(`${OPEN_ELEVATION_URL}?locations=${locations}`, {
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error(`Open-Elevation error: ${response.status}`)
  }
  const data = await response.json() as { results?: { elevation: number }[] }
  if (!data?.results || data.results.length === 0) {
    throw new Error('Open-Elevation returned empty results')
  }
  return data.results.map(result => Math.round(result.elevation))
}

const fetchElevations = async (points: ElevationPoint[]) => {
  const elevations: number[] = []
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE)
    const batchElevations = await fetchBatch(batch)
    elevations.push(...batchElevations)
    if (i + BATCH_SIZE < points.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
  return elevations
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { points?: ElevationPoint[] }
    const points = Array.isArray(body?.points) ? body.points : []

    if (points.length === 0) {
      return NextResponse.json({ elevations: [] })
    }
    if (points.length > MAX_POINTS) {
      return NextResponse.json(
        { error: `Too many points: ${points.length}` },
        { status: 400 }
      )
    }

    const cacheKey = buildCacheKey(points)
    const cached = cache.get(cacheKey)
    if (cached) {
      return NextResponse.json({ elevations: cached })
    }

    const elevations = await fetchElevations(points)
    cache.set(cacheKey, elevations)

    return NextResponse.json({ elevations })
  } catch (error) {
    console.error('Error fetching elevation profile:', error)
    return NextResponse.json({ error: 'Failed to fetch elevations' }, { status: 500 })
  }
}
