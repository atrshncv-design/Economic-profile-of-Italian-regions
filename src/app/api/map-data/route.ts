import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// Region colors based on economic zones
const regionColors: Record<string, { fill: string; stroke: string; zone: string }> = {
  // North
  'Piemonte': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Lombardia': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Veneto': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Emilia-Romagna': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Friuli-Venezia Giulia': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Liguria': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Valle d\'Aosta/Vallée d\'Aoste': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  'Trentino-Alto Adige/Südtirol': { fill: '#10b981', stroke: '#059669', zone: 'north' },
  // Central
  'Toscana': { fill: '#f59e0b', stroke: '#d97706', zone: 'central' },
  'Umbria': { fill: '#f59e0b', stroke: '#d97706', zone: 'central' },
  'Marche': { fill: '#f59e0b', stroke: '#d97706', zone: 'central' },
  'Lazio': { fill: '#f59e0b', stroke: '#d97706', zone: 'central' },
  // South
  'Abruzzo': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  'Molise': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  'Campania': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  'Puglia': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  'Basilicata': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  'Calabria': { fill: '#ef4444', stroke: '#dc2626', zone: 'south' },
  // Islands
  'Sicilia': { fill: '#8b5cf6', stroke: '#7c3aed', zone: 'islands' },
  'Sardegna': { fill: '#8b5cf6', stroke: '#7c3aed', zone: 'islands' },
}

// Project coordinates to SVG space
function projectCoordinates(
  coordinates: number[][] | number[][][] | number[][][],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  padding: number = 20
): string {
  const { minX, minY, maxX, maxY } = bounds
  const scaleX = (width - 2 * padding) / (maxX - minX)
  const scaleY = (height - 2 * padding) / (maxY - minY)
  const scale = Math.min(scaleX, scaleY)
  
  const offsetX = padding + (width - 2 * padding - (maxX - minX) * scale) / 2
  const offsetY = padding + (height - 2 * padding - (maxY - minY) * scale) / 2
  
  const projectPoint = (lng: number, lat: number): [number, number] => {
    const x = offsetX + (lng - minX) * scale
    const y = height - offsetY - (lat - minY) * scale // Flip Y axis
    return [x, y]
  }
  
  const processCoords = (coords: unknown): string => {
    if (typeof coords[0] === 'number') {
      const [x, y] = projectPoint(coords[0] as number, coords[1] as number)
      return `${x},${y}`
    }
    
    // Check if this is a multi-polygon
    if (Array.isArray(coords[0]) && Array.isArray((coords[0] as unknown[])[0]) && Array.isArray(((coords[0] as unknown[])[0] as unknown[])[0])) {
      // Multi-polygon: coords[][][][]
      return (coords as unknown as unknown[][][]).map(poly => processCoords(poly)).join(' ')
    }
    
    // Check if this is a polygon with rings
    if (Array.isArray(coords[0]) && Array.isArray((coords[0] as unknown[])[0])) {
      // Polygon with rings: coords[][][]
      return (coords as unknown as number[][][]).map((ring, ri) => {
        const points = ring.map((p, i) => {
          const [x, y] = projectPoint(p[0], p[1])
          return `${i === 0 && ri === 0 ? 'M' : i === 0 ? 'M' : 'L'}${x},${y}`
        }).join(' ')
        return points + ' Z'
      }).join(' ')
    }
    
    // Linear ring: coords[][]
    return (coords as unknown as number[][]).map((p, i) => {
      const [x, y] = projectPoint(p[0], p[1])
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ') + ' Z'
  }
  
  return processCoords(coordinates)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const levelParam = searchParams.get('level')
    const level = levelParam === 'provinces' ? 'provinces' : 'regions'
    const fileName = level === 'provinces' ? 'italy_provinces.geojson' : 'italy_regions.geojson'
    const filePath = path.join(process.cwd(), 'public', 'data', fileName)
    const data = await readFile(filePath, 'utf-8')
    const geojson = JSON.parse(data)
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    geojson.features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach(ring => {
          ring.forEach(([lng, lat]) => {
            minX = Math.min(minX, lng)
            minY = Math.min(minY, lat)
            maxX = Math.max(maxX, lng)
            maxY = Math.max(maxY, lat)
          })
        })
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            ring.forEach(([lng, lat]) => {
              minX = Math.min(minX, lng)
              minY = Math.min(minY, lat)
              maxX = Math.max(maxX, lng)
              maxY = Math.max(maxY, lat)
            })
          })
        })
      }
    })
    
    const bounds = { minX, minY, maxX, maxY }
    const width = 400
    const height = 500
    
    // Process each feature
    const regions = geojson.features.map(feature => {
      const name = level === 'provinces'
        ? (feature.properties?.prov_name || 'Unknown')
        : (feature.properties?.reg_name || 'Unknown')
      const regionName = feature.properties?.reg_name || name
      const colorInfo = regionColors[regionName] || { fill: '#6b7280', stroke: '#4b5563', zone: 'unknown' }
      
      let pathData = ''
      if (feature.geometry.type === 'Polygon') {
        pathData = projectCoordinates(feature.geometry.coordinates, bounds, width, height)
      } else if (feature.geometry.type === 'MultiPolygon') {
        pathData = feature.geometry.coordinates.map(poly => 
          projectCoordinates(poly as number[][][], bounds, width, height)
        ).join(' ')
      }
      
      // Calculate centroid for label
      let centroid = { x: 0, y: 0 }
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0]
        centroid = {
          x: coords.reduce((sum, p) => sum + p[0], 0) / coords.length,
          y: coords.reduce((sum, p) => sum + p[1], 0) / coords.length
        }
      }
      
      return {
        name,
        path: pathData,
        fill: colorInfo.fill,
        stroke: colorInfo.stroke,
        zone: colorInfo.zone,
        centroid: feature.geometry.type === 'Polygon' ? centroid : null
      }
    })
    
    // City coordinates (longitude, latitude)
    const cities = [
      { name: 'Турин', nameIt: 'Torino', lng: 7.6869, lat: 45.0703, elevation: 240, zone: 'north' },
      { name: 'Милан', nameIt: 'Milano', lng: 9.1900, lat: 45.4642, elevation: 120, zone: 'north' },
      { name: 'Венеция', nameIt: 'Venezia', lng: 12.3155, lat: 45.4408, elevation: 2, zone: 'north' },
      { name: 'Флоренция', nameIt: 'Firenze', lng: 11.2558, lat: 43.7696, elevation: 50, zone: 'central' },
      { name: 'Рим', nameIt: 'Roma', lng: 12.4964, lat: 41.9028, elevation: 20, zone: 'central' },
      { name: 'Неаполь', nameIt: 'Napoli', lng: 14.2681, lat: 40.8518, elevation: 17, zone: 'south' },
      { name: 'Таранто', nameIt: 'Taranto', lng: 17.2470, lat: 40.4644, elevation: 15, zone: 'south' }
    ]
    
    // Project city coordinates
    const projectedCities = cities.map(city => {
      const x = 20 + (width - 40 - (maxX - minX) * Math.min((width - 40) / (maxX - minX), (height - 40) / (maxY - minY))) / 2 + (city.lng - minX) * Math.min((width - 40) / (maxX - minX), (height - 40) / (maxY - minY))
      const y = height - 20 - (height - 40 - (maxY - minY) * Math.min((width - 40) / (maxX - minX), (height - 40) / (maxY - minY))) / 2 - (city.lat - minY) * Math.min((width - 40) / (maxX - minX), (height - 40) / (maxY - minY))
      return { ...city, x, y }
    })
    
    // Generate route path
    const routePath = projectedCities.map((city, i) => 
      `${i === 0 ? 'M' : 'L'}${city.x.toFixed(2)},${city.y.toFixed(2)}`
    ).join(' ')
    
    return NextResponse.json({
      regions,
      cities: projectedCities,
      routePath,
      bounds,
      width,
      height,
      level
    })
  } catch (error) {
    console.error('Error processing map data:', error)
    return NextResponse.json({ error: 'Failed to process map data' }, { status: 500 })
  }
}
