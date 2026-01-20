# 🚀 Fleet Logix - Quick Start Guide

## ⚠️ IMPORTANT: Login Required!

**Fleet Logix requires you to be LOGGED IN to view data.**

The system uses authentication to ensure data security and multi-tenant isolation.

---

## 📋 Step-by-Step Instructions

### Step 1: Login to the Application

1. Open your browser
2. Go to: `http://localhost:5000`
3. Find the **Login** button (usually in the top right corner or on the homepage)
4. Enter your credentials:
   - Username
   - Password
5. Click **Login**

### Step 2: Navigate to Fleet Logix

**After you're logged in**, you have two options:

**Option A: Use the Menu**
- Look for the main navigation menu
- Find **"Dashboards"** section
- Click on **"Fleet Logix"** 🚚

**Option B: Direct URL**
- After logging in, navigate to: `http://localhost:5000/fleetlogix`

### Step 3: Verify Your Data

Once you're on the Fleet Logix page, you should see:

#### Tabs at the Top:
- 🚛 **Loads**
- 👤 **Drivers** (81 drivers)
- 🚗 **Vehicles** (38 vehicles)
- 🗺️ **Routes** (27 routes)
- 💰 **Salaries**
- ✅ **Reconciliation**

#### What You'll See:
1. Click on **Drivers** tab → Should show 81 drivers
2. Click on **Vehicles** tab → Should show 38 vehicles
3. Click on **Routes** tab → Should show 27 routes

---

## 🔍 Troubleshooting

### Problem: "Blank screen" or "Nothing shows"

**Most Common Cause:** Not logged in

**Solution:**
1. Make sure you see your username/profile in the top right
2. If you don't see it, you're not logged in
3. Go back to `http://localhost:5000` and login first

### Problem: "Unable to load drivers" error message

**Cause:** Session expired or not authenticated

**Solution:**
1. Click the "Refresh Page" button shown in the error
2. If that doesn't work, logout and login again
3. Then navigate back to Fleet Logix

### Problem: "Unauthorized" in browser console

**Cause:** You're trying to access Fleet Logix without being logged in

**Solution:**
1. Open the main app: `http://localhost:5000`
2. Login with your credentials
3. THEN go to Fleet Logix

### Problem: Can't find the Login button

**Check these locations:**
- Top right corner of the page
- Homepage/landing page
- URL: `http://localhost:5000/login` (try this directly)

---

## ✅ Data Import Status

Your data has been successfully imported:

| Entity | Count | Status |
|--------|-------|--------|
| Routes | 27 | ✅ Imported |
| Drivers | 81 | ✅ Imported |
| Vehicles | 38 | ✅ Imported |

Examples of imported data:

**Drivers:**
- Ayanda Tembe
- Meshack Khathide
- Sihle Thabo Nkosi
- And 78 more...

**Vehicles:**
- LG24GMGP (FL01)
- LC18LKGP (FL02)
- LC18KWGP (FL06)
- And 35 more...

**Routes:**
- EXXARO LEEUWPAN → SASOL BOSJESSPRUIT (102 km)
- MBALI COLLIERY → SASOL BOSJESSPRUIT (89 km)
- And 25 more...

---

## 🎯 First Time User Checklist

- [ ] **Server is running** (check: http://localhost:5000 loads)
- [ ] **I am logged in** (see my username in top right)
- [ ] **I navigated to Fleet Logix** (via menu or direct URL)
- [ ] **I can see the tabs** (Loads, Drivers, Vehicles, etc.)
- [ ] **Drivers tab shows 81 drivers**
- [ ] **Vehicles tab shows 38 vehicles**
- [ ] **Routes tab shows 27 routes**

If all checkboxes are checked ✅ - You're all set!

---

## 🚀 Next Steps After Login

Once you're logged in and can see your data:

### 1. Explore Your Data
- Click through each tab
- View the imported drivers, vehicles, and routes
- Familiarize yourself with the interface

### 2. Create Your First Load
1. Go to **Loads** tab
2. Click **"Create Load"**
3. Fill in the form:
   - Date: Select today's date
   - Route: Choose from dropdown (distance & rate auto-fill!)
   - Driver: Choose a driver
   - Vehicle: Choose a vehicle
   - Tonnage: Enter tonnage (e.g., 30)
4. Click **"Create"**

### 3. Calculate Test Salaries
1. Create 2-3 loads first
2. Go to **Salaries** tab
3. Select current month
4. Click **"Calculate Salaries"**
5. View the breakdown

### 4. Test Reconciliation
1. Go to **Reconciliation** tab
2. Click **"Add Entry"**
3. Fill in details
4. System calculates variance automatically

---

## 📚 Getting Help

### Check Browser Console
Press `F12` to open Developer Tools and check for errors:
- Look for red text in the Console tab
- Look for failed requests in the Network tab

### Common Error Messages

**"Unauthorized"** → You're not logged in
- Solution: Login first

**"Failed to fetch"** → Server might not be running
- Solution: Check if `http://localhost:5000` loads
- Restart server if needed: `npm run dev`

**"Cannot read properties of undefined"** → Data not loading
- Solution: Make sure you're logged in
- Refresh the page

---

## 🔐 Why Login is Required

Fleet Logix uses authentication for:

1. **Security**: Protect sensitive business data
2. **Multi-tenancy**: Each company sees only their own data
3. **Audit trail**: Track who did what and when
4. **Access control**: Different permissions for different users

---

## 📞 Summary

1. ✅ **Login first** at http://localhost:5000
2. ✅ **Then navigate** to Fleet Logix
3. ✅ **Your data is there** - 27 routes, 81 drivers, 38 vehicles

**The blank screen issue = Not logged in**

**Solution = Login, then access Fleet Logix** 🎉

---

**Server**: http://localhost:5000
**Fleet Logix**: http://localhost:5000/fleetlogix (after login)
**Status**: ✅ System ready, data imported, waiting for you to login!
