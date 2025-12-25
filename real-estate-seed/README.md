# Seed Supabase Database - Quick Start

## 1. Setup Environment Variables

Copy `.env.example` to `.env` and fill in your values:
```powershell
cd real-estate-seed
Copy-Item .env.example .env
notepad .env
```

Required values:
- `SUPABASE_URL` - From Supabase Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Project Settings → API (service_role secret)

## 2. Update Vapi Phone ID

Edit `seed.js` line 85 and replace with your actual Vapi phone number ID:
```javascript
const VAPI_PHONE_ID = 'phone-number-YOUR-REAL-ID-HERE'; 
```

Get this from: Vapi Dashboard → Phone Numbers → Copy the ID

## 3. Run the Seed Script

```powershell
npm run seed
```

## 4. Verify in Supabase

Go to Supabase Dashboard → Table Editor and check:
- ✅ **tenants** table has 2 rows (Sarah & John)
- ✅ **phone_mappings** table has 2 rows
- ✅ **leads** table has 1 row (Mike Investor)

## Troubleshooting

**Error: "User already exists"**
- Delete users in Supabase Dashboard → Authentication → Users
- Re-run the seed script

**Error: "relation does not exist"**
- Make sure your schema is created first
- Check table names match: `tenants`, `phone_mappings`, `leads`

**Error: "Missing environment variables"**
- Verify `.env` file exists in `real-estate-seed/` folder
- Check values are correct (no quotes needed in .env)
