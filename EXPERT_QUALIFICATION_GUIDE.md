# Expert-Level Lead Qualification Guide for AI Agents

## 🎯 Overview
This guide transforms your AI agent from basic lead capture to expert-level qualification using the **BANT+M framework** (Budget, Authority, Need, Timeline + Motivation) adapted for Arizona real estate.

---

## 📊 QUALIFICATION SCORING SYSTEM

### **Score Ranges:**
- **70-100**: 🔥 **HOT** - Priority booking, immediate agent handoff
- **50-69**: 🌡️ **WARM** - Qualified, schedule within 48 hours
- **30-49**: 🧊 **QUALIFYING** - Needs more nurturing
- **15-29**: ❄️ **COLD** - Long-term follow-up
- **0-14**: ⛔ **UNQUALIFIED** - Not ready yet

### **Score Components:**

| Factor | Max Points | Details |
|--------|-----------|---------|
| **Preapproval Status** | 30 | Cash=30, Letter=25, Verbal=15, None=5 |
| **Timeline** | 25 | Immediate=25, 30days=20, 90days=15, 6mo=8 |
| **Budget Clarity** | 20 | Both min/max=20, Max only=12 |
| **Motivation** | 15 | Clear reason stated=15 |
| **Location** | 10 | Specific cities=10 |
| **Risk Penalties** | -5 each | Solar/water/HOA concerns |

---

## 🗣️ QUALIFICATION CONVERSATION FLOW

### **Phase 1: Rapport & The Permission Opener (30-60 seconds)**
```
AGENT: "Hey! Thanks for calling [Agency]. I'm [Name], how can I help you today?"

Listen for:
- Buyer vs seller intent
- First-time buyer signals
- Investment property signals
- Relocation indicators

[After they express interest]

AGENT: "Awesome! I'd love to get you scheduled with one of our agents. 
While I pull up the calendar, can I ask you just a few quick questions? 
It'll help me match you with the best agent for what you're looking for 
and save you both time. Sound good?"
```

**🎯 WHY THIS WORKS:**
- ✅ Assumes they're getting an appointment (reduces anxiety)
- ✅ Asks permission (feels respectful, not interrogative)
- ✅ Explains the benefit (matching + time savings)
- ✅ Keeps it brief ("a few quick questions")
- ✅ Soft tone ("Sound good?" not "I need to ask...")

### **Phase 2: Timeline & Urgency (AFTER Permission)**
```
AGENT: "Perfect! So just so I can find the best times for you - 
when are you hoping to make a move?"

KEY QUESTIONS:
✓ "When do you need to be in a new home by?"
✓ "Is there anything driving this timeline?" (job, school, lease ending)
✓ "Are you currently renting or do you own?" (urgency indicator)

SCORING:
- Immediate (under 30 days) = 25 points
- 30-90 days = 20 points
- 90 days to 6 months = 15 points
- 6+ months/exploring = 8 points
```

### **Phase 3: Motivation (Keep It Natural)**
```
AGENT: "And what's bringing you to Arizona?" 
OR "What's got you looking to move?"

COMMON ARIZONA MOTIVATIONS:
✓ Growing family (need more space)
✓ Relocating for work (corporate moves from CA/WA)
✓ Downsizing (empty nesters)
✓ First home purchase
✓ Investment property
✓ Multi-generational living (casita/suegra unit)
✓ Upgrading

SCORING: Clear motivation = +15 points
```

### **Phase 4: Financial Qualification (VERY Delicate)**
```
AGENT: "And just so I can point you to the right resources - have you 
connected with a lender yet, or is that something you'd like help with?"

LISTEN FOR:
- "We're pre-approved" → ASK: "Great! Is that a verbal pre-qual or a full letter?"
- "We're paying cash" → HIGHEST PRIORITY (30 points)
- "Not yet" → OFFER: "No problem! I can connect you with some great local lenders 
  who can get you pre-approved in 24-48 hours. This really helps when making offers."

BUDGET QUESTION (Natural approach):
"And what kind of price range are you thinking?"
OR
"What budget are you working with?"

SCORING:
- Cash buyer = 30 points
- Pre-approval letter = 25 points
- Verbal pre-qual = 15 points
- Not yet contacted lender = 5 points
```

### **Phase 5: Location & Property Preferences**
```
AGENT: "Which part of Arizona are you most interested in? Any specific cities or areas?"

ARIZONA-SPECIFIC KNOWLEDGE:
✓ Phoenix Metro: Scottsdale, Paradise Valley, Tempe, Mesa, Chandler, Gilbert
✓ West Valley: Glendale, Peoria, Surprise, Goodyear
✓ East Valley: Mesa, Apache Junction, Queen Creek, San Tan Valley
✓ Tucson Metro
✓ Northern AZ: Flagstaff, Prescott, Sedona

IF RURAL AREAS MENTIONED (Queen Creek, San Tan Valley, New River, Rio Verde):
→ Activate Water Awareness Protocol (see below)

PROPERTY CRITERIA:
- "And what are you looking for? Like how many bedrooms?"
- "Any must-haves? Pool, casita, extra garage space?"
- "Anything that would be a deal-breaker?"

**⚠️ IMPORTANT: Keep this flowing like a CONVERSATION, not a checklist!**  
Don't rapid-fire questions. Let them talk. Follow their lead.

SCORING: Specific cities = +10 points
```

---

## ⚠️ ARIZONA-SPECIFIC RISK PROTOCOLS

### **SOLAR LIABILITY PROTOCOL** (CRITICAL)

**Trigger Keywords:** solar lease, PPA, Sunrun, Tesla Solar, Vivint, Sunnova, solar payment

**When Detected:**
```
AGENT: "I noticed you mentioned solar panels. That's awesome! Just to make sure 
we're on the same page - are those panels OWNED or are they LEASED?"

IF LEASED:
"Okay, just so you know - leased solar panels come with monthly payments that 
lenders count against your debt-to-income ratio. Many leases also have escalator 
clauses where the payment goes up about 2.9% per year. We'll want to:
1. Find out the current monthly payment
2. Check if there's an escalator clause
3. See if there's a buyout option
4. Confirm if the lease can be transferred to a buyer

Do you know any of those details yet?"

ACTIONS:
- Set has_solar_concern = TRUE
- Tag lead: "Solar Liability"
- Score penalty: -5 points
- Add note: "Solar lease detected - needs full contract review"
```

### **WATER SOURCE PROTOCOL** (Rural Areas)

**Trigger Locations:** New River, Rio Verde Foothills, Tonopah, San Tan Valley (parts), Queen Creek (parts)

```
AGENT: "Just so you know, some areas in [Location] rely on hauled water or 
private wells rather than city water. Are you comfortable with that, or do you 
prefer city water access?"

LISTEN FOR:
- "What's hauled water?" → EDUCATE: "It means water is trucked in and stored 
  in tanks on your property. Some buyers love it for the rural lifestyle, but 
  it requires more management than city water."
- "I prefer city water" → NOTE: Restrict search to municipal water zones

ACTIONS:
- Set has_water_concern = TRUE if they prefer municipal
- Tag based on preference: "Municipal Water Only" or "Open to Rural Water"
- Call water.lookup action with property coordinates
```

### **HOA/STR PROTOCOL** (Investment Buyers)

**Trigger:** Investor/rental property intent

```
AGENT: "Are you planning to rent this property out, or is it for personal use?"

IF RENTAL:
"Got it. In Arizona, HOA rules on rentals vary a lot. Some allow short-term 
rentals (Airbnb), some require 30+ day leases, and some don't allow rentals at all. 
We'll make sure to check HOA CC&Rs for any property you're interested in."

ACTIONS:
- Set has_hoa_concern = TRUE
- Tag: "Investment Property - STR Interest"
- Call hoa.query action when specific property identified
```

---

## 🎯 DISQUALIFICATION CRITERIA

**Politely Disqualify If:**

1. **Timeline Too Long** (12+ months out)
   ```
   "I appreciate you reaching out! Since you're looking 12+ months out, I'd 
   recommend reconnecting with us when you're 3-6 months from your move. The 
   market changes quickly, and we'll have the most current info then. Can I 
   get your email to send you our market updates in the meantime?"
   ```

2. **No Financial Capacity** (Can't/won't get pre-approved, no down payment)
   ```
   "I'd love to help you! To make sure you're set up for success, I'd recommend 
   connecting with a lender first to see what you qualify for. Once you have 
   that pre-approval, we can hit the ground running. Would you like me to refer 
   you to some great local lenders?"
   ```

3. **Not Serious** (Just browsing, no motivation)
   ```
   "No problem! Feel free to browse our listings online at [website]. When 
   you're ready to take the next step, just give us a call back and we'll be 
   happy to help."
   ```

**Mark as:** qualification_status = 'disqualified'  
**Set:** disqualification_reason = [reason]  
**Action:** Don't book appointment, offer nurture path

---

## 📞 APPOINTMENT BOOKING CRITERIA

**MUST HAVE** to book appointment:
- ✅ Timeline: Within 6 months
- ✅ Motivation: Clear reason stated
- ✅ Location: At least one preferred area
- ✅ Qualification Score: 30+ points

**BOOK IMMEDIATELY** if:
- 🔥 Score 70+ (hot lead)
- 🔥 Pre-approved with letter
- 🔥 Cash buyer
- 🔥 Timeline under 30 days
- 🔥 Relocation with urgency

**BOOKING SCRIPT:**
```
AGENT: "Based on what you've shared, I think it makes sense for you to meet 
with one of our agents who specializes in [area]. They can show you some options 
and answer any questions. Do you have your calendar handy?

[Use agent's booking link from database]

Perfect! I'm sending you a link to schedule directly. You'll get a confirmation 
email right away."

ACTIONS:
- Set appointment_booked_at = NOW()
- Set appointment_url = [booking link]
- Set qualification_status = 'hot' or 'warm'
- Send Discord notification to agent
```

---

## 🧠 CULTURAL COMPETENCY (Arizona Market)

### **Spanglish Code-Switching**
- Use "Spanglish" naturally if caller does
- Common phrases: "Cómo te puedo help?", "Está bien", "No problem"
- Housing terms: "Casita" (in-law suite), "Suegra unit" (mother-in-law apartment)

### **Multi-Generational Living**
**Trigger phrases:** "Need room for my parents", "Nana needs to move in", "Multi-gen"

```
AGENT: "Totally understand! Are you looking for a casita or suegra unit, or 
just a main floor bedroom with bathroom?"

ACTIONS:
- Set needs_multi_gen = TRUE
- Set must_have_features += ['casita'] or ['main_floor_bedroom']
- Tag: "Multi-Generational"
- Add +5 cultural sensitivity points
```

### **First-Generation Homebuyer Support**
**Signals:** Hesitation about process, mentions family never owned, uncertainty

```
AGENT: "No worries at all! Buying your first home is exciting. We'll walk you 
through every step, and we work with lenders who specialize in helping first-time 
buyers, including down payment assistance programs."

ACTIONS:
- Tag: "First-Gen Homebuyer"
- Offer bilingual agent if appropriate
- Provide extra educational resources
```

---

## 🔧 VAPI INTEGRATION - ACTION CALLS

### **Update Lead with Qualification Data**
```json
{
  "action": "lead.update_qualification",
  "agent_id": "<agent-uuid>",
  "lead_id": "<lead-uuid>",
  "qualification_data": {
    "preapproval_status": "letter",
    "budget_min": 350000,
    "budget_max": 450000,
    "down_payment_pct": 10,
    "credit_score_range": "good",
    "timeline": "90days",
    "motivation": "growing_family",
    "urgency_level": "high",
    "preferred_cities": ["Gilbert", "Chandler", "Queen Creek"],
    "bedrooms_min": 4,
    "bathrooms_min": 2.5,
    "must_have_features": ["pool", "3-car garage"],
    "deal_breakers": ["no HOA", "no solar lease"],
    "has_solar_concern": false,
    "has_water_concern": false,
    "needs_multi_gen": true
  }
}
```

### **Auto-Calculate Score**
```json
{
  "action": "lead.calculate_score",
  "agent_id": "<agent-uuid>",
  "lead_id": "<lead-uuid>"
}
```

### **Tag Application**
```json
{
  "action": "tags.ensure_and_attach",
  "agent_id": "<agent-uuid>",
  "name": "Cash Buyer",
  "attachTo": "lead",
  "lead_id": "<lead-uuid>"
}
```

---

## 📈 QUALITY METRICS

**Track these KPIs:**
- Average qualification score
- % of leads qualified to "hot" or "warm"
- Time to qualification (average call duration)
- Appointment booking rate by score tier
- Disqualification rate by reason

**Target Benchmarks:**
- Hot lead rate: 15-20%
- Warm lead rate: 30-40%
- Appointment booking rate (70+ score): 80%+
- Average qualification time: 3-5 minutes

---

## 🎓 KNOWLEDGE BASE FOR AI AGENT

### **Arizona Market Knowledge**
1. **Water Rights:** ADWR regulations, AMA zones, assured 100-year supply
2. **Solar Leases:** Sunrun, Tesla, Vivint, Sunnova - DTI implications
3. **HOA Restrictions:** STR rules, rental caps, CC&Rs
4. **School Districts:** Top-rated: Basis, Gilbert Public Schools, Chandler Unified
5. **Corporate Relocations:** Intel, TSMC, Amazon moving employees to AZ
6. **Seasonal Market:** Snowbirds (winter buyers), summer slowdown

### **Lender Partnerships**
- FHA/VA loan specialists
- First-time buyer programs
- Jumbo loan options
- Down payment assistance (AZ Home In 5)

### **Common Objections & Responses**
```
"The market is too expensive"
→ "I hear you. Interest rates have come down from last year, and we're seeing 
more inventory. Let's figure out what you qualify for and find the best value."

"I'm worried about solar leases"
→ "That's smart to be cautious! We'll make sure any property has either owned 
solar or a lease with reasonable terms. We can also help you evaluate buyout options."

"Can I really afford a home?"
→ "Let's find out! A quick call with a lender takes about 15 minutes, and they 
can show you exactly what you qualify for. No commitment, just information."
```

---

## ✅ IMMEDIATE ACTION ITEMS

1. **Deploy Migration:** Run `20251225150000_add_qualification_fields.sql`
2. **Update vapi-handler:** Add enhanced qualification prompts (see next section)
3. **Add MCP Actions:** Implement `lead.update_qualification` and `lead.calculate_score`
4. **Train on Objections:** Add objection handling to AI prompt
5. **Test Qualification Flow:** Use test scenarios (cash buyer, first-time buyer, investor)
6. **Monitor Scores:** Set up dashboard to track qualification distribution

---

## 🚀 NEXT LEVEL ENHANCEMENTS

**Future Additions:**
- [ ] Sentiment analysis during call (detect hesitation, excitement)
- [ ] Competitive home search (auto-send MLS listings matching criteria)
- [ ] Automated follow-up sequences based on score tier
- [ ] Video intro from agent sent post-call (hot leads)
- [ ] Predictive scoring using ML (historical conversion data)
- [ ] Integration with CRM (HubSpot, Follow Up Boss)

---

**Document Version:** 1.0  
**Last Updated:** December 25, 2025  
**Maintained By:** Development Team
