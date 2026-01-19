# Quick Reference Card

## 🎮 Keyboard & Mouse Controls

### Widget Controls
| Action | How To |
|--------|--------|
| **Move Widget** | Drag ⋮⋮ handle |
| **Resize Widget** | Drag from corners |
| **Delete Widget** | Click 🗑️ trash icon |
| **Add Widget** | Click "+ Add Widget" → Select type |

### Dashboard Controls
| Action | How To |
|--------|--------|
| **Toggle Theme** | Click 🌙 Moon or ☀️ Sun icon |
| **Scroll to Top** | Click ⬆️ button (appears after scrolling) |
| **Reset Dashboard** | Click 🔄 Reset button |
| **Open Side Panel** | Click "+ Add Widget" |
| **Close Side Panel** | Click "Close Panel" |

## 📊 Widget Types Quick Reference

| Icon | Widget | Size | Best For |
|------|--------|------|----------|
| 📊 | Stat Widget | 3×2 | Single KPI/metric |
| 📊 | Bar Chart | 6×4 | Compare values |
| 🥧 | Pie Chart | 4×3 | Show proportions |
| 📈 | Line Chart | 6×4 | Trends over time |
| 🔔 | Activity Feed | 4×3 | Recent events |
| 🍩 | Donut Chart | 4×3 | Traffic/sources |
| 📈 | Area Chart | 6×4 | Revenue/growth |
| 📋 | Data Table | 6×4 | Detailed records |
| ⚡ | Gauge Chart | 4×3 | Performance % |
| 📅 | Heatmap | 4×3 | Calendar activity |
| 🎯 | Funnel Chart | 4×3 | Conversion stages |

## 🎨 Theme Reference

### Light Mode Colors
```css
Background:    #f5f7fa
Widgets:       #ffffff
Text:          #1a202c
Borders:       #e5e7eb
```

### Dark Mode Colors
```css
Background:    #1a202c
Widgets:       #2d3748
Text:          #e2e8f0
Borders:       #4a5568
```

## 🔌 Data Source Types

| Type | Icon | Example |
|------|------|---------|
| API | 🔌 | REST API, Google Analytics |
| Database | 💾 | MySQL, PostgreSQL, MongoDB |
| Static | 📄 | JSON, CSV files |

## 💾 localStorage Keys

| Key | Stores |
|-----|--------|
| `darkMode` | Theme preference (true/false) |
| `dashboard-layout` | Widget positions & sizes |
| `dashboard-widgets` | Widget configurations |
| `dashboard-datasources` | Connected data sources |

## 🚀 Quick Start Checklist

- [ ] Open http://localhost:3001
- [ ] Toggle dark/light mode
- [ ] Scroll down to see scroll-to-top button
- [ ] Click "Add Widget" to open side panel
- [ ] Add a new widget (try Donut Chart)
- [ ] Drag widget by ⋮⋮ handle
- [ ] Resize widget from corner
- [ ] Delete a widget with trash icon
- [ ] Switch to "Data Sources" tab
- [ ] View configured data sources
- [ ] Click "Reset" to restore defaults

## 🎯 Common Tasks

### Add a Chart Widget
1. Click "+ Add Widget"
2. Choose chart type (Bar, Pie, Line, etc.)
3. Widget appears with sample data
4. Drag to position, resize as needed

### Change Theme
1. Click Moon (☾) icon for dark mode
2. Click Sun (☀) icon for light mode
3. Preference saves automatically

### Organize Dashboard
1. Drag widgets by ⋮⋮ handle
2. Resize from corners
3. Delete unwanted widgets
4. Add new widgets as needed
5. Layout saves automatically

### Connect Data Source
1. Click "+ Add Widget"
2. Go to "Data Sources" tab
3. Click "+ Add Data Source"
4. Configure endpoint/settings
5. Link to widgets

## 📱 Mobile Tips

- Use touch to drag widgets
- Pinch to zoom dashboard
- Tap and hold ⋮⋮ to move
- Double-tap corners to resize

## 🐛 Troubleshooting

### Widget not moving?
→ Make sure you're dragging the ⋮⋮ handle

### Layout not saving?
→ Check browser console for localStorage errors

### Theme not switching?
→ Clear localStorage and refresh

### Reset not working?
→ Hard refresh page (Ctrl+Shift+R)

## 🎓 Tips & Tricks

1. **Organize by size**: Put stat widgets in top row (3×2)
2. **Group by type**: Keep charts together for easy comparison
3. **Use dark mode**: Easier on eyes for long sessions
4. **Delete unused**: Keep dashboard clean and fast
5. **Reset anytime**: Click Reset to restore default setup
6. **Scroll efficiently**: Use scroll-to-top button for long dashboards
7. **Data sources**: Connect widgets to live APIs for real-time data

## 🔗 Quick Links

- Dashboard: http://localhost:3001
- Documentation: /home/zubeid/dragdropui/NEW_FEATURES.md
- Seed Data Info: /home/zubeid/dragdropui/SEED_DATA.md

---

**Need help?** Check NEW_FEATURES.md for detailed documentation!
