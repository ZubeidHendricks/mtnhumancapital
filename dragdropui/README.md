# Dashboard Builder

A modern, customizable dashboard builder with drag-and-drop widgets, built with TypeScript and React.

## 🚀 Features

- **Drag & Drop Dashboard** - Customizable widget layout
- **11 Widget Types** - Stats, charts, tables, gauges, and more
- **Dark/Light Mode** - Theme toggle with smooth transitions
- **Data Source Management** - Connect to APIs, databases, or static files
- **Auto-Save** - Layout and preferences persist in localStorage
- **Responsive Design** - Works on all screen sizes
- **No Dependencies** - Standalone system, no external CMS required

## 📁 Project Structure

```
dashboard-builder/
├── backend/          # TypeScript Express API (optional)
│   ├── src/
│   │   ├── database/    # Models and database config
│   │   ├── rest/        # REST API endpoints
│   │   └── ...
│   └── package.json
├── frontend/         # React Dashboard Interface
│   ├── src/
│   │   ├── pages/       # Dashboard pages
│   │   ├── services/    # API services
│   │   └── ...
│   └── package.json
└── docs/            # Documentation
    ├── NEW_FEATURES.md    # Latest features
    ├── QUICK_REFERENCE.md # Quick guide
    └── SEED_DATA.md       # Default widget data
```

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Drag & Drop:** React Grid Layout
- **Icons:** Lucide React
- **Routing:** React Router

### Optional Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (optional)
- **ORM:** Sequelize

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Frontend Setup (Main Dashboard)

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The dashboard will be available at **http://localhost:3001**

### Optional Backend Setup

```bash
cd backend
npm install

# Configure environment (if using backend)
cp .env.example .env

# Start development server
npm run dev
```

## 📊 Dashboard Features

### Widget Types
1. **Stat Widget** - Display key metrics
2. **Bar Chart** - Compare values
3. **Pie Chart** - Show proportions
4. **Line Chart** - Trends over time
5. **Donut Chart** - Traffic sources
6. **Area Chart** - Revenue trends
7. **Data Table** - Detailed records
8. **Gauge Chart** - Performance meters
9. **Heatmap** - Activity calendar
10. **Funnel Chart** - Conversion stages
11. **Activity Feed** - Recent events

### Controls
- **Drag & Drop** - Move widgets by handle (⋮⋮)
- **Resize** - Drag from corners
- **Delete** - Remove unwanted widgets
- **Theme Toggle** - Switch dark/light mode
- **Auto-Save** - Layout persists automatically
- **Scroll to Top** - Floating button for long dashboards

## 📖 Documentation

- [NEW_FEATURES.md](NEW_FEATURES.md) - Latest feature additions
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick reference guide
- [SEED_DATA.md](SEED_DATA.md) - Default widget configurations

## 🎨 Screenshots & Demo

Visit **http://localhost:3001** after starting the dev server to see:
- 14 pre-loaded widgets with sample data
- Dark/Light mode toggle
- Drag & drop functionality
- Responsive grid layout

## 🙏 Acknowledgments

Built with modern web technologies and best practices for customizable dashboard creation.

---

**Version:** 2.0.0  
**Last Updated:** December 2024
