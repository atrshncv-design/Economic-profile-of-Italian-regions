import { NextResponse } from 'next/server'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'karta-italii/1.0 (contact: dev@karta-italii.local)'

type NominatimResult = {
  lat: string
  lon: string
  display_name?: string
  name?: string
  type?: string
  class?: string
  importance?: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') ?? '').trim()
    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '6',
      addressdetails: '1',
      countrycodes: 'it'
    })

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'it,en',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.json({ results: [] }, { status: 502 })
    }

    const data = await response.json() as NominatimResult[]
    const results = (Array.isArray(data) ? data : []).map(item => ({
      name: item.name || item.display_name?.split(',')[0] || query,
      displayName: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: item.type,
      class: item.class,
      importance: item.importance
    })).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocode error:', error)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
