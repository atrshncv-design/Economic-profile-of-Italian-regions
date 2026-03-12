// Координаты маршрута: Турин -> Милан -> Венеция -> Флоренция -> Рим -> Неаполь -> Таранто

interface Point {
  lat: number;
  lng: number;
  distance: number; // км от начала
  name?: string;
}

// Координаты городов
const cities: Point[] = [
  { lat: 45.0703, lng: 7.6869, distance: 0, name: 'Турин' },
  { lat: 45.4642, lng: 9.1900, distance: 140, name: 'Милан' },
  { lat: 45.4408, lng: 12.3155, distance: 410, name: 'Венеция' },
  { lat: 43.7696, lng: 11.2558, distance: 670, name: 'Флоренция' },
  { lat: 41.9028, lng: 12.4964, distance: 950, name: 'Рим' },
  { lat: 40.8518, lng: 14.2681, distance: 1170, name: 'Неаполь' },
  { lat: 40.4636, lng: 17.2480, distance: 1430, name: 'Таранто' }
];

// Интерполяция точек между городами (каждые ~20 км)
function interpolatePoints(cities: Point[], stepKm: number = 20): Point[] {
  const points: Point[] = [];
  
  for (let i = 0; i < cities.length - 1; i++) {
    const start = cities[i];
    const end = cities[i + 1];
    const distKm = end.distance - start.distance;
    const numSteps = Math.ceil(distKm / stepKm);
    
    for (let j = 0; j <= numSteps; j++) {
      const t = j / numSteps;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      const distance = start.distance + (end.distance - start.distance) * t;
      points.push({ lat, lng, distance });
    }
  }
  
  return points;
}

// Получение высоты через Open Elevation API
async function getElevations(points: Point[]): Promise<number[]> {
  const locations = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json() as { results: { elevation: number }[] };
    return data.results.map(r => Math.round(r.elevation));
  } catch (error) {
    console.error('API Error:', error);
    return points.map(() => 0);
  }
}

async function main() {
  const points = interpolatePoints(cities, 30);
  console.log(`Total points: ${points.length}`);
  
  // Разбиваем на батчи по 100 точек (лимит API)
  const batchSize = 100;
  const elevations: number[] = [];
  
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(points.length/batchSize)}...`);
    const batchElevations = await getElevations(batch);
    elevations.push(...batchElevations);
    await new Promise(r => setTimeout(r, 1000)); // Задержка между запросами
  }
  
  // Вывод результатов
  console.log('\n// Данные рельефа (реальные высоты из Open Elevation API)');
  console.log('const terrainPoints = [');
  points.forEach((p, i) => {
    const city = cities.find(c => Math.abs(c.distance - p.distance) < 1);
    const comment = city ? ` // ${city.name}` : '';
    console.log(`  { x: ${p.distance}, elevation: ${elevations[i]} },${comment}`);
  });
  console.log(']');
  
  // Вывод высот городов
  console.log('\n// Высоты городов:');
  cities.forEach(c => {
    const idx = points.findIndex(p => Math.abs(p.distance - c.distance) < 1);
    if (idx >= 0) {
      console.log(`// ${c.name}: ${elevations[idx]} м`);
    }
  });
}

main();
