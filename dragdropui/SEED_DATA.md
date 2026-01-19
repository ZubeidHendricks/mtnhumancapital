# Dashboard Seed Data

The dashboard now loads with realistic seed data on first visit!

## 📊 Seed Widgets (9 total)

### Stat Widgets (4)
1. **📝 Total Posts** - Shows 247 posts
2. **👥 Active Users** - Shows 1,834 users  
3. **🖼️ Media Files** - Shows 592 files
4. **💬 Comments** - Shows 3,421 comments

Each displays:
- Large metric number
- Connected data source indicator
- Growth percentage (↑ 12.5% from last month)

### Chart Widgets (3)

1. **User Growth Trend** (Line Chart)
   - 7-month trend visualization
   - Interactive line graph with data points
   - Connected to Google Analytics data source

2. **Top Performing Posts** (Bar Chart)
   - 5 items with percentage bars
   - Color-coded performance indicators
   - Connected to Google Analytics

3. **Page Views by Category** (Bar Chart)
   - Category-based performance metrics
   - Horizontal bar visualization
   - Connected to Google Analytics

### Pie Chart (1)
**Content Distribution**
- Posts: 30% (blue)
- Pages: 25% (green)
- Media: 20% (orange)
- Other: 25% (purple)
- Visual donut chart with legend
- Connected to WordPress REST API

### Activity Feed (1)
**Recent Activity Feed**
Shows 6 real-time activities:
- 📝 New post published (2 min ago)
- 👤 New user registered (15 min ago)
- 💬 Comment added (1 hour ago)
- 🖼️ Media uploaded (2 hours ago)
- ✏️ Post updated (3 hours ago)
- 🔌 Plugin activated (5 hours ago)

Each activity includes:
- Emoji icon
- Action description
- Details
- Timestamp
- Color-coded left border

## 🔌 Seed Data Sources (3)

1. **REST API**
   - Type: API
   - Endpoint: `https://your-site.com/api/v1`
   - Status: Authenticated
   - Used by: Stat widgets, Pie chart

2. **Google Analytics**
   - Type: API
   - Endpoint: `https://analytics.google.com/api/v1`
   - Config: API Key configured
   - Used by: Chart widgets

3. **Local Database**
   - Type: Database
   - Host: localhost
   - Database: dashboard_db
   - Status: Connected

## 📐 Default Layout

Grid: 12 columns × 100px row height

```
Row 0-1:  [Stat A] [Stat B] [Stat C] [Stat D]
          (3×2)    (3×2)    (3×2)    (3×2)

Row 2-5:  [Line Chart       ] [Bar Chart        ]
          (6×4)               (6×4)

Row 6-8:  [Pie Chart] [Activity Feed] [Bar Chart]
          (4×3)       (4×3)            (4×3)
```

## 🔄 Reset Feature

Click the **🔄 Reset** button in the header to:
- Clear all localStorage data
- Reload seed data
- Reset to default layout

## 🎨 Visual Features

### Stat Widgets
- Large 42px metric numbers
- Color-coded by type (blue, green, orange, purple)
- Data source badge
- Growth indicator with green up arrow
- Responsive hover states

### Bar Charts
- 5 horizontal bars
- Gradient color scheme
- Percentage labels
- Smooth animations
- Data source connection shown

### Pie Chart
- SVG-based donut chart
- 4 segments with distinct colors
- Legend with color indicators
- Percentage breakdown
- Clean, modern design

### Line Chart
- 7 data points (Jan-Jul)
- Smooth curve with circles
- Grid background
- Month labels
- Purple accent color (#667eea)

### Activity Feed
- 6 recent activities
- Left border color coding
- Emoji indicators
- Timestamp display
- Scrollable content

## 💾 Storage

All data is stored in localStorage:
- `dashboard-layout` - Widget positions and sizes
- `dashboard-widgets` - Widget configurations
- `dashboard-datasources` - Connected data sources

## 🚀 Try It Out

1. Open http://localhost:3001
2. See 9 widgets with realistic data
3. Drag widgets by the ⋮⋮ handle
4. Resize from corners
5. Delete widgets with trash icon
6. Add new widgets from side panel
7. View/manage data sources
8. Click Reset to restore defaults

All changes auto-save to localStorage!
