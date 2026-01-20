# Dashboard Builder Frontend

A modern React + TypeScript dashboard with customizable drag-and-drop widgets.

## 🎯 Features

✨ **Drag & Drop Dashboard**
- Customizable widget layout with drag handles
- Resize and rearrange widgets freely
- Auto-save layout to localStorage
- Multiple widget types (Stats, Charts, Activity Feeds)

📊 **Widget System**
- **Stat Widgets** - Display key metrics and numbers
- **Bar Charts** - Compare data values
- **Pie Charts** - Show proportions and percentages
- **Line Charts** - Track trends over time
- **Activity Feeds** - Show recent events and updates

🎨 **Side Panel Manager**
- Add new widgets with one click
- Manage data sources
- Configure widget settings
- Remove unwanted widgets

💾 **Data Source Management**
- Connect to APIs
- Database integrations
- Static data files
- Link data sources to widgets

🎨 **Modern UI**
- Clean, responsive design
- No login required (authentication removed)
- TypeScript for type safety
- Vite for fast development
- Lucide icons

## 🚀 Quick Start

### Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:3001**

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx      # Main drag-drop dashboard with side panel
│   ├── services/
│   │   └── api.ts             # API service layer
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── App.tsx                # Router setup
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎨 Using the Dashboard

### Adding Widgets
1. Click "Add Widget" button in the top-right
2. Choose from available widget types:
   - Stat Widget (metrics)
   - Bar Chart
   - Pie Chart
   - Line Chart
   - Activity Feed
3. Widget appears on dashboard automatically

### Managing Widgets
- **Move**: Drag the ⋮⋮ handle
- **Resize**: Drag from bottom-right corner
- **Delete**: Click the trash icon on any widget
- **Auto-save**: Layout persists in localStorage

### Data Sources
1. Click "Add Widget" → "Data Sources" tab
2. Click "Add Data Source"
3. Configure:
   - Name
   - Type (API, Database, Static)
   - Endpoint URL
4. Connect to widgets for live data

## 🎯 Widget Types

### Stat Widget
Display single metrics or KPIs
- Size: 3x2 grid units
- Best for: Counts, totals, percentages

### Bar Chart
Compare multiple data values
- Size: 6x4 grid units
- Best for: Comparisons, rankings

### Pie Chart
Show data proportions
- Size: 6x4 grid units
- Best for: Distributions, percentages

### Line Chart
Track trends over time
- Size: 6x4 grid units
- Best for: Time series, trends

### Activity Feed
Recent events and updates
- Size: 6x4 grid units
- Best for: Logs, notifications, updates

## 📋 Available Scripts

```bash
npm run dev      # Start development server (port 3001)
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔧 Configuration

### Dashboard Grid
- 12 columns
- 100px row height
- 1200px default width
- Responsive resizing

### Storage
- Layout: `localStorage['dashboard-layout']`
- Widgets: `localStorage['dashboard-widgets']`
- Data Sources: `localStorage['dashboard-datasources']`

## 📚 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Grid Layout** - Drag & drop grid system
- **React Router** - Client-side routing
- **Lucide React** - Icon library
- **Axios** - HTTP client

## 🚀 Deployment

### Build for Production
```bash
npm run build
# Creates dist/ folder
```

### Deploy Options
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Push `dist/` to gh-pages branch
- **Own Server**: Serve `dist/` with Nginx/Apache

## 🎯 Current Features

✅ Direct dashboard access (no login)
✅ Drag and drop widgets
✅ Resize widgets
✅ Side panel for adding widgets
✅ Data source management
✅ Auto-save layout
✅ Delete widgets
✅ Multiple widget types
✅ Responsive design

## 📖 Documentation

- [React Grid Layout Docs](https://github.com/react-grid-layout/react-grid-layout)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Dashboard is live!** Open http://localhost:3001 to start customizing your dashboard. 🚀
