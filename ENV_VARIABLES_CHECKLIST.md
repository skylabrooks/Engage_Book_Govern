# ✅ Environment Variables Checklist

## Your Current .env File

```
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ RENT_CAST_API
✅ VAPI_WEBHOOK_SECRET
✅ GOOGLE_GEMINI_KEY
✅ GOOGLE_GENERATIVE_AI_KEY
```

---

## Required by Code (What You Actually Need)

### 🔴 **Critical - Must Have**

| Variable | Used By | Status | Notes |
|----------|---------|--------|-------|
| `SUPABASE_URL` | All functions + seed.js | ✅ Present | Required for Supabase connection |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions + seed.js | ✅ Present | Bypass RLS for backend operations |
| `GOOGLE_GENERATIVE_AI_KEY` | solar-ocr-scanner | ✅ Present | Google Gemini 1.5 Flash for OCR |
| `VAPI_WEBHOOK_SECRET` | vapi-handler + vapi-webhook.js | ✅ Present | Webhook authentication |

### 🟡 **Optional - Nice to Have**

| Variable | Used By | Status | Notes |
|----------|---------|--------|-------|
| `DISCORD_WEBHOOK_URL` | seed.js | ❌ Missing | Used for Discord notifications (has fallback) |
| `RENT_CAST_API` | seed.js (hardcoded test key) | ✅ Present | RentCast API key (not actively used yet) |
| `GOOGLE_GEMINI_KEY` | Not found in code | ⚠️ Unused | Duplicate of GOOGLE_GENERATIVE_AI_KEY |

---

## Analysis

### ✅ You Have Everything Critical

All required environment variables for:
- ✅ Supabase connection (seed.js, all functions)
- ✅ Solar OCR (Google Gemini Vision API)
- ✅ Vapi webhook authentication
- ✅ Discord notifications (optional, has fallback)

### ⚠️ Note on Unused Variables

- **`GOOGLE_GEMINI_KEY`** - You have this, but it's not used in code. The code uses `GOOGLE_GENERATIVE_AI_KEY` instead. They appear to be the same thing. You can keep it as backup.

- **`RENT_CAST_API`** - Present in .env but seed.js hardcodes a test key. Not critical for current functionality.

---

## What Each Variable Does

### SUPABASE_URL
**What:** Your Supabase project URL  
**Used by:** All functions, seed.js  
**Example:** `https://rxutdpcbzwmpombmbkkq.supabase.co`

### SUPABASE_SERVICE_ROLE_KEY
**What:** Master key that bypasses RLS (Row-Level Security)  
**Used by:** All Edge Functions, seed.js  
**Purpose:** Backend operations that need full database access  
**⚠️ SENSITIVE:** Keep this secret, only use in backend/server contexts

### GOOGLE_GENERATIVE_AI_KEY
**What:** Google Cloud API key for Gemini Vision  
**Used by:** solar-ocr-scanner function  
**Purpose:** Extract solar contract data from images/PDFs  
**Required for:** Solar lease OCR analysis

### VAPI_WEBHOOK_SECRET
**What:** Secret for validating Vapi webhook signatures  
**Used by:** vapi-handler, vapi-webhook.js  
**Purpose:** Authenticate incoming Vapi requests  
**Note:** Yours appears to be a Discord webhook URL—see note below

### DISCORD_WEBHOOK_URL (Optional)
**What:** Discord webhook for notifications  
**Used by:** seed.js (for test agent creation)  
**Status:** Optional (seed.js has fallback)  
**Current:** Not in your .env, but not needed for most operations

---

## ⚠️ IMPORTANT: VAPI_WEBHOOK_SECRET Value

Your current value looks like a **Discord webhook URL**:
```
https://discordapp.com/api/webhooks/1451481271954964502/xj_Zt05_QImA3iOO19rANsgxKHrs3s-9rGzvKEcnlXi6hmIwtVIOLU4hYgbtX5mTEOtM
```

But the code expects a **Vapi webhook secret token** (usually a string like `vapi_xxx`).

### Options:
1. **If you want Discord notifications:** Keep this value as `DISCORD_WEBHOOK_URL` instead
2. **For Vapi webhook auth:** Get the secret from Vapi dashboard (Webhook settings → secret token)

---

## Deployment Checklist

### For Local Development
- ✅ `SUPABASE_URL` - Set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Set
- ✅ `GOOGLE_GENERATIVE_AI_KEY` - Set
- ✅ `VAPI_WEBHOOK_SECRET` - Set (though value may need adjustment)
- ⏺️ `DISCORD_WEBHOOK_URL` - Optional

### For Production (Supabase)
Use Supabase dashboard to set secrets:
```bash
npx supabase secrets set \
  SUPABASE_URL=your_url \
  SUPABASE_SERVICE_ROLE_KEY=your_key \
  GOOGLE_GENERATIVE_AI_KEY=your_key \
  VAPI_WEBHOOK_SECRET=your_secret
```

---

## Summary

**You have 4/4 critical variables.** ✅

The only potential issue: Your `VAPI_WEBHOOK_SECRET` appears to be a Discord webhook URL. Clarify whether:
- You want Discord notifications → rename to `DISCORD_WEBHOOK_URL`
- You want Vapi webhook auth → replace with actual Vapi secret

Everything else is good to go!
