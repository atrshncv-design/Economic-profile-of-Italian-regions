// Тест генерации высот профиля
const SCALE = {
  profileWidth: 1000,
  profileHeight: 200,
  maxElevation: 1500,
  leftPadding: 45,
  rightPadding: 15,
  bottomPadding: 70,
  topPadding: 35
}

const distanceToX = (d: number) => SCALE.leftPadding + (d / 1430) * SCALE.profileWidth
const elevationToY = (e: number) => {
  if (e <= 1000) {
    return SCALE.topPadding + SCALE.profileHeight - (e / SCALE.maxElevation) * SCALE.profileHeight
  } else {
    const compressed = 1000 + (e - 1000) * 0.1
    return SCALE.topPadding + SCALE.profileHeight - (compressed / SCALE.maxElevation) * SCALE.profileHeight
  }
}

const generateTerrainPoints = () => {
  const points: { x: number; y: number; elevation: number }[] = []
  
  // Турин - Милан
  for (let i = 0; i <= 14; i++) {
    const d = i * 10
    const e = Math.max(120, 240 - (i * 8.5))
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }
  
  // Милан - Венеция
  for (let i = 0; i <= 27; i++) {
    const d = 140 + i * 10
    const e = Math.max(2, 120 - (i * 4.4))
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }
  
  // Венеция - Флоренция
  for (let i = 0; i <= 26; i++) {
    const d = 410 + i * 10
    let e: number
    if (i < 8) e = Math.max(2, 2 + i * 12)
    else if (i < 17) e = Math.min(903, 100 + (i - 8) * 90)
    else e = Math.max(50, 903 - (i - 17) * 85)
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }
  
  // Флоренция - Рим
  for (let i = 0; i <= 28; i++) {
    const d = 670 + i * 10
    let e: number
    if (i < 5) e = Math.min(300, 50 + i * 50)
    else if (i < 10) e = Math.min(850, 300 + (i - 5) * 110)
    else if (i < 15) e = Math.max(200, 850 - (i - 10) * 130)
    else e = Math.max(20, 200 - (i - 15) * 18)
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }
  
  // Рим - Неаполь
  for (let i = 0; i <= 22; i++) {
    const d = 950 + i * 10
    let e: number
    if (i < 5) e = Math.min(300, 20 + i * 56)
    else if (i < 10) e = Math.min(600, 300 + (i - 5) * 60)
    else if (i < 15) e = Math.max(50, 600 - (i - 10) * 110)
    else e = Math.max(17, 50 - (i - 15) * 6)
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }
  
  // Неаполь - Таранто
  for (let i = 0; i <= 26; i++) {
    const d = 1170 + i * 10
    let e: number
    if (i < 5) e = Math.min(200, 17 + i * 36)
    else if (i < 12) e = Math.min(900, 200 + (i - 5) * 100)
    else if (i < 18) e = Math.max(200, 900 - (i - 12) * 116)
    else e = Math.max(15, 200 - (i - 18) * 18)
    points.push({ x: distanceToX(d), y: elevationToY(e), elevation: e })
  }

  return points
}

const points = generateTerrainPoints()
const minE = Math.min(...points.map(p => p.elevation))
const maxE = Math.max(...points.map(p => p.elevation))

console.log('=== Анализ высот профиля ===')
console.log(`Всего точек: ${points.length}`)
console.log(`Минимальная высота: ${minE} м`)
console.log(`Максимальная высота: ${maxE} м`)
console.log(`\nПроверка на отрицательные значения:`)
const negative = points.filter(p => p.elevation < 0)
if (negative.length === 0) {
  console.log('✅ Нет отрицательных высот!')
} else {
  console.log(`❌ Найдено ${negative.length} точек с отрицательной высотой`)
  negative.forEach(p => console.log(`  x=${p.x}: ${p.elevation} м`))
}

console.log(`\nКлючевые точки маршрута:`)
console.log(`  Турин (0 км): ${points.find(p => p.x === distanceToX(0))?.elevation} м`)
console.log(`  Милан (140 км): ${points.find(p => p.x === distanceToX(140))?.elevation} м`)
console.log(`  Венеция (410 км): ${points.find(p => p.x === distanceToX(410))?.elevation} м`)
console.log(`  Перевал Фута (~585 км): ${Math.max(...points.filter(p => p.x > distanceToX(500) && p.x < distanceToX(600)).map(p => p.elevation))} м`)
console.log(`  Флоренция (670 км): ${points.find(p => p.x === distanceToX(670))?.elevation} м`)
console.log(`  Средние Апеннины (~820 км): ${Math.max(...points.filter(p => p.x > distanceToX(750) && p.x < distanceToX(900)).map(p => p.elevation))} м`)
console.log(`  Рим (950 км): ${points.find(p => p.x === distanceToX(950))?.elevation} м`)
console.log(`  Неаполь (1170 км): ${points.find(p => p.x === distanceToX(1170))?.elevation} м`)
console.log(`  Монти-Дауни (~1320 км): ${Math.max(...points.filter(p => p.x > distanceToX(1250) && p.x < distanceToX(1400)).map(p => p.elevation))} м`)
console.log(`  Таранто (1430 км): ${points.find(p => p.x === distanceToX(1430))?.elevation} м`)
