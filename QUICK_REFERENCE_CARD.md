# 🎯 Expert Qualification Quick Reference Card

**Print this and keep it handy!**

---

## 📊 **SCORING CHEAT SHEET**

| Component | Points | Key Questions |
|-----------|--------|---------------|
| **💰 Preapproval** | 0-30 | "Have you spoken with a lender?" |
| Cash = 30 | Letter = 25 | Verbal = 15 | None = 5 |
| **⏰ Timeline** | 0-25 | **"When do you need to move?"** (ASK FIRST!) |
| Immediate = 25 | 30days = 20 | 90days = 15 | 6mo = 8 | Exploring = 3 |
| **💵 Budget** | 0-20 | "What price range are you comfortable with?" |
| Both min/max = 20 | Max only = 12 | Vague = 5 |
| **💡 Motivation** | 0-15 | "What's prompting this move?" |
| Clear reason = 15 | Unknown = 0 |
| **📍 Location** | 0-10 | "Which areas are you focusing on?" |
| Specific cities = 10 | Vague = 0 |
| **⚠️ Risk Flags** | -5 each | Solar/Water/HOA concerns |

---

## 🎯 **QUALIFICATION TIERS**

| Tier | Score | Action | Booking Target |
|------|-------|--------|----------------|
| 🔥 **HOT** | 70-100 | Book NOW | 80%+ rate |
| 🌡️ **WARM** | 50-69 | Book within 48hrs | 60-70% rate |
| 🧊 **QUALIFYING** | 30-49 | Nurture campaign | 30-40% rate |
| ❄️ **COLD** | 15-29 | Long-term follow-up | <20% rate |
| ⛔ **UNQUALIFIED** | 0-14 | Reconnect later | Not booked |

---

## 🗣️ **CONVERSATION SEQUENCE**

```
1. GREETING → "Hi! Thanks for calling. How can I help?"
   ↓
2. PERMISSION OPENER → "I'd love to get you scheduled! Can I ask 
   a few quick questions while I pull up the calendar?"
   ↓
3. TIMELINE → "When are you hoping to move?" (Natural, not interrogative)
   ↓
4. MOTIVATION → "What's bringing you to Arizona?" (Conversational)
   ↓
5. BUDGET → "What price range are you thinking?" (Soft)
   ↓
6. FINANCIAL → "Have you connected with a lender yet?" (Helpful tone)
   ↓
7. LOCATION → "Which areas interest you?" (Open-ended)
   ↓
8. PROPERTY → "What are you looking for?" (Natural flow)
   ↓
9. RISKS → (Solar/Water protocols if triggered)
   ↓
10. SCORE → (Auto-calculated silently)
   ↓
11. DECISION → Book, Nurture, or Politely Redirect
```

**Time: 3-5 minutes | Tone: Helpful, not interrogative**

---

## ⚠️ **RISK PROTOCOLS**

### 🔆 **Solar Lease Detection**
**Keywords:** solar lease, PPA, Sunrun, Tesla Solar, Vivint

**Script:** *"Are those panels OWNED or LEASED?"*
- IF LEASED → Explain DTI impact, escalators, ask for monthly payment
- **Penalty:** -5 points, Tag: "Solar Liability"

### 💧 **Water Source Warning**
**Trigger:** New River, Rio Verde, Queen Creek, San Tan Valley

**Script:** *"Some areas rely on hauled water. Are you comfortable with that?"*
- IF "Prefer city water" → Limits inventory
- **Penalty:** -5 points if concern raised

### 🏘️ **HOA/STR Check**
**Trigger:** Investor/rental property intent

**Script:** *"HOA rules vary. We'll check CC&Rs for rental restrictions."*
- **Tag:** "Investment Property - STR Interest"

---

## 🚫 **DISQUALIFICATION CRITERIA**

| Reason | Script |
|--------|--------|
| **Timeline 12+ months** | *"Since you're looking over a year out, reconnect when you're 3-6 months away. Can I get your email?"* |
| **No financial capacity** | *"I'd recommend connecting with a lender first. Would you like a referral?"* |
| **Just browsing** | *"Feel free to browse our listings online. Call back when you're ready!"* |

**Mark as:** `disqualified`  
**Set reason:** `timeline_too_long` / `no_financing` / `not_serious`

---

## 📞 **BOOKING SCRIPTS**

### For HOT Leads (70+)
*"Based on what you've shared, I think it makes sense for you to meet with one of our agents who specializes in [area]. They can show you some options. Do you have your calendar handy?"*

### For WARM Leads (50-69)
*"I'd love to get you connected with one of our agents within the next day or two. When works best for you?"*

### For QUALIFYING Leads (30-49)
*"Let me get your email so I can send you resources and listings. As you get closer, we'd love to help you."*

---

## 🎓 **ARIZONA CULTURAL KNOWLEDGE**

| Term | Meaning | Action |
|------|---------|--------|
| **Casita / Suegra Unit** | In-law suite | Set `needs_multi_gen = TRUE` |
| **Nana's Room** | Main floor bedroom | Add to `must_have_features` |
| **Horse Property** | Large lot with animal zoning | Note acreage requirement |

**Spanglish:** Code-switch naturally if caller does!
- "Cómo te puedo help?"
- "Está bien"
- Use "carro" not "coche"

---

## 🔧 **MCP ACTIONS**

### Update Qualification Data
```json
{
  "action": "lead.update_qualification",
  "agent_id": "uuid",
  "lead_id": "uuid",
  "preapproval_status": "letter",
  "timeline": "90days",
  "motivation": "growing_family",
  "budget_max": 450000,
  "preferred_cities": ["Gilbert", "Chandler"]
}
```

### Calculate Score
```json
{
  "action": "lead.calculate_score",
  "agent_id": "uuid",
  "lead_id": "uuid"
}
```

---

## 📊 **DAILY DASHBOARD QUERIES**

### Hot Leads Needing Follow-up
```sql
SELECT name, phone_number, qualification_score, budget_max
FROM leads
WHERE qualification_status = 'hot'
  AND appointment_booked_at IS NULL
ORDER BY qualification_score DESC;
```

### Qualification Distribution
```sql
SELECT qualification_status, COUNT(*) as count
FROM leads
GROUP BY qualification_status;
```

---

## ✅ **DEPLOYMENT CHECKLIST**

- [ ] Apply migration: `npx supabase db push --include-all`
- [ ] Deploy vapi-handler: `npx supabase functions deploy vapi-handler --no-verify-jwt`
- [ ] Deploy vapi-mcp-server: `npx supabase functions deploy vapi-mcp-server --no-verify-jwt`
- [ ] Run test script: `./test-qualification.ps1`
- [ ] Test with real Vapi call
- [ ] Monitor logs: `npx supabase functions logs vapi-handler --tail`
- [ ] Set up hot lead alerts
- [ ] Train team on new scoring

---

## 🎯 **SUCCESS METRICS (30 Days)**

| Metric | Target |
|--------|--------|
| Hot lead rate | 15-20% |
| Warm lead rate | 25-35% |
| Booking rate (hot leads) | 80%+ |
| Agent time savings | 50%+ |
| Close rate improvement | 20-30% |

---

## 📚 **FULL DOCUMENTATION**

- **[EXPERT_QUALIFICATION_GUIDE.md](EXPERT_QUALIFICATION_GUIDE.md)** - Complete framework (180+ lines)
- **[CONVERSATION_FLOW_GUIDE.md](CONVERSATION_FLOW_GUIDE.md)** - Visual conversation flows
- **[QUALIFICATION_TESTING_GUIDE.md](QUALIFICATION_TESTING_GUIDE.md)** - Testing & deployment
- **[QUALIFICATION_IMPLEMENTATION_SUMMARY.md](QUALIFICATION_IMPLEMENTATION_SUMMARY.md)** - Implementation overview

---

## 🆘 **TROUBLESHOOTING**

| Issue | Solution |
|-------|----------|
| Score not calculating | Check trigger: `SELECT * FROM pg_trigger WHERE tgname = 'leads_qualification_score_trigger';` |
| MCP actions failing | Check logs: `npx supabase functions logs vapi-mcp-server` |
| Vapi not using new prompts | Redeploy: `npx supabase functions deploy vapi-handler --no-verify-jwt` |

---

**Version 1.0** | **Last Updated:** December 25, 2025

**Print this page and keep it at your desk!** 🚀
