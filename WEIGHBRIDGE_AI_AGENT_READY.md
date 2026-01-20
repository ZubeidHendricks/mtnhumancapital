# 🚛 Weighbridge AI Agent - Free Vision AI Options

## 🆓 Supported FREE Vision AI Providers

The system tries these in order:

### 1. **Google Gemini** (RECOMMENDED - FREE!)
- ✅ **Generous free tier**
- ✅ 1,500 requests/day free
- ✅ Best for production use
- Model: `gemini-1.5-flash`

**Get free API key:**
```
https://aistudio.google.com/app/apikey
```

Add to `.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. **Groq Llama 3.2 Vision**
- ✅ Free tier available
- ✅ Fast inference
- Models: llama-3.2 vision variants

Already configured (uses existing GROQ_API_KEY)

### 3. **OpenAI GPT-4o-mini**
- Paid but cheap ($0.15/1M tokens)
- Best accuracy
- Fallback option

### 4. **Manual Entry Mode**
- If no AI available
- Upload image for reference
- Fill data manually

## 🚀 Quick Setup (FREE)

### Option A: Google Gemini (Recommended)
```bash
# 1. Get free API key: https://aistudio.google.com/app/apikey
# 2. Add to .env:
GEMINI_API_KEY=AIzaSy...your-key-here

# 3. Restart server
npm run dev

# 4. Upload weighbridge slips - AI extracts data automatically!
```

### Option B: Use Groq (Already configured)
Your existing `GROQ_API_KEY` will be tried automatically.

### Option C: Manual Entry
Just upload - image saves, you fill in data manually.

## 📊 How It Works

1. **Upload** weighbridge slip image
2. **AI tries** (in order):
   - Gemini (if key present)
   - Groq Llama Vision
   - OpenAI (if key present)
   - Manual template
3. **Extracts** all data automatically
4. **Saves** to database
5. **Displays** in dashboard

## 🎯 Best FREE Option: Google Gemini

Gemini 1.5 Flash is:
- ✅ Completely free (1,500 requests/day)
- ✅ Excellent vision AI
- ✅ Fast and accurate
- ✅ No credit card required

**Get your free key now:**
https://aistudio.google.com/app/apikey

## 📝 Usage

```bash
# Go to FLEET LOGIX dashboard
http://localhost:5000?tenant=fleetlogix

# Navigate: Dashboards → Weighbridge

# Upload your weighbridge slips:
- attached_assets/fleetlogix/weighbridge certificate.jpeg
- attached_assets/fleetlogix/weight slip.jpeg

# AI extracts: vehicle, weights, operator, product, etc.
```

## ✅ Current Status

- ✅ System ready
- ✅ Multiple AI fallbacks
- ✅ Manual mode works
- ⏳ Add Gemini key for free AI extraction

**Recommendation: Get free Gemini API key in 2 minutes!**
