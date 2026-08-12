# Economic Profile of Italian Regions

An interactive research map of the economic profile of Italian regions — a geography coursework/research project built with **Next.js + React + TypeScript**.

> **Status: experiment** — research/coursework project, not a production service.

## Features

- Interactive SVG map of Italy with all 20 regions
- Regions colored by economic zone: North / Central / South / Islands
- Major cities with coordinates and elevations
- Economic corridors between key cities with sector details (agriculture, industry, etc.)
- Hover details and comparative economic characteristics per region

## Data

- `data/italy_regions.json` — region boundaries (TopoJSON) and attributes used by the app

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Build: `npm run build && npm run start`.

---

# Экономический профиль регионов Италии

Интерактивная исследовательская карта экономического профиля регионов Италии — учебно-исследовательский проект по географии на **Next.js + React + TypeScript**.

> **Статус: experiment** — исследовательский/учебный проект, не production-сервис.

## Возможности

- Интерактивная SVG-карта Италии со всеми 20 регионами
- Окраска регионов по экономическим зонам: Север / Центр / Юг / Острова
- Крупные города с координатами и высотами над уровнем моря
- Экономические коридоры между ключевыми городами с отраслевыми характеристиками (сельское хозяйство, промышленность и др.)
- Детали при наведении и сравнительные экономические характеристики регионов

## Данные

- `data/italy_regions.json` — границы регионов (TopoJSON) и атрибуты, используемые приложением

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000`. Сборка: `npm run build && npm run start`.
