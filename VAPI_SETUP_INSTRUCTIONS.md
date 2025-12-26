# 🚀 How to Add First Message & System Prompt to Vapi

## Step-by-Step Setup

### Step 1: Open Your Vapi Assistant
1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Click on your assistant (e.g., "Alex - Luxury Real Estate")
3. Click "Edit" or the gear icon to open settings

---

### Step 2: Set the First Message

**Location in Vapi UI:**
- Look for the section labeled **"First Message"**
- There may be a field labeled "Message" or "First Message"

**What to paste:**
```
Hi there! Thanks for calling [Agency Name]. I'm here to help you find your perfect home in Arizona. What's your name, and what brings you in today?
```

**After pasting:**
- Replace `[Agency Name]` with your actual company name
- Click Save

**Visual Guide:**
```
┌─────────────────────────────────────────┐
│  First Message                          │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ Hi there! Thanks for calling        ││
│  │ Desert Realty. I'm here to help     ││
│  │ you find your perfect home in       ││
│  │ Arizona. What's your name, and      ││
│  │ what brings you in today?           ││
│  └─────────────────────────────────────┘│
│                                         │
│  [Save]                      [Cancel]  │
└─────────────────────────────────────────┘
```

---

### Step 3: Set the System Prompt

**Location in Vapi UI:**
- Look for the section labeled **"System Prompt"** or **"Instructions"**
- This is usually a larger text area

**What to paste:**
Use the complete System Prompt from [VAPI_COPY_PASTE_READY.md](VAPI_COPY_PASTE_READY.md)

The entire thing starting with:
```
You are Alex, a premier Executive Assistant for a luxury real estate agency in Arizona...
```

And ending with:
```
...Remember: Your job is to be helpful, not gatekeep...
```

**After pasting:**
- Replace `[Agency Name]` with your company
- Replace `[area]` with your primary service area
- Replace `[website]` with your listings URL
- Click Save

**Note:** This is a LONG prompt (~2000+ words). That's okay! Vapi handles it fine.

---

### Step 4: Verify Other Settings

Make sure these are configured (usually pre-set):

**Model:**
- Should be: `GPT-4` or `GPT-4 Turbo` (or latest OpenAI model)

**First Message Mode:**
- Should be: `Assistant speaks first` ✓

**Max Duration:** 
- Set to: `15` or `20` minutes (or your preference)

**Language:**
- Should be: `English` (but system prompt handles Spanglish)

---

### Step 5: Test Your Setup

#### Option A: Test in Vapi UI
1. Click **"Test"** button at top of settings
2. When prompt appears, click the phone icon to test call
3. Listen to the First Message - should sound natural
4. Have a 2-3 minute test conversation
5. Verify the assistant:
   - ✓ Greets warmly
   - ✓ Asks permission before qualifying questions
   - ✓ Sounds conversational (not robotic)
   - ✓ Handles basic questions well

#### Option B: Make a Real Test Call
1. Get your Vapi phone number
2. Call from another phone
3. Have a full test conversation
4. Take notes on anything that needs adjustment
5. Update System Prompt if needed

---

### Step 6: Make Adjustments (If Needed)

**If the First Message sounds too formal:**
Try: `"Hey! Thanks for calling [Agency Name]. I'm here to help you find your perfect home in Arizona. What's your name?"`

**If questions feel robotic:**
Look in System Prompt for "QUALIFICATION FRAMEWORK" section and adjust the exact phrasing.

**If Spanglish isn't working:**
Make sure this line is in System Prompt:
```
- Bilingual: Fluent in English and Spanglish (code-switch naturally)
```

**If assistant is rushing through questions:**
Add to System Prompt after "Let Them Talk" section:
```
Remember to pause after each answer and acknowledge what they said before 
moving to the next question. A conversation should feel natural, not rushed.
```

---

### Step 7: Deploy to Production

**When you're happy with your test:**

1. Click the **Deploy** or **Publish** button
2. Select your phone number(s) to activate
3. Wait for confirmation (usually instant)
4. You're live! 🎉

**Next steps:**
- Monitor your first 10-20 calls
- Track hangup rate (should be <10%)
- Note any repeated issues
- Adjust as needed

---

## Complete Setup Checklist

- [ ] First Message copied and customized
- [ ] System Prompt copied and customized
- [ ] All placeholders replaced ([Agency Name], [area], [website])
- [ ] Model set to GPT-4 or better
- [ ] First Message Mode set to "Assistant speaks first"
- [ ] Test call made - sounds natural
- [ ] No rapid-fire questions
- [ ] Permission opener works well
- [ ] Decision tree scripts ready
- [ ] Lender referrals documented (not in Vapi, but ready)
- [ ] Team trained on soft qualification approach
- [ ] Deployed to production
- [ ] Monitoring first calls for quality

---

## Common Issues & Fixes

### "The assistant sounds robotic"
**Fix:** System Prompt includes natural language instructions. If still robotic:
1. Check that "First Message Mode" is "Assistant speaks first"
2. Increase the micro-acknowledgment emphasis in prompt
3. Test again

### "The assistant is asking too many questions too fast"
**Fix:** Add this to System Prompt after "Let Them Talk":
```
Pause for 1-2 seconds after each answer. Acknowledge what they said. 
Then ask the next question naturally—not rapid-fire. This is a conversation, 
not an interview.
```

### "Callers are still hanging up after permission question"
**Fix:** The permission question might need adjustment. Try:
```
"I'd love to help you find the right place. Mind if I ask just a couple 
quick questions so I can make sure you get matched with the best person? 
Should only take a minute."
```

### "Assistant isn't recognizing solar lease questions"
**Fix:** Make sure this section is in your System Prompt:
```
### SOLAR PANELS (Critical Risk)
If they mention solar: "I see you mentioned solar—that's important...
```

### "Calls are dropping after booking attempt"
**Fix:** Make sure you have a proper booking link or next steps script
in your Vapi configuration.

---

## Phone Number Configuration

Make sure you've connected your phone number(s) in Vapi:

1. **Settings** → **Phone Numbers**
2. For each number, set:
   - Assistant: Your custom assistant (Alex - Luxury Real Estate)
   - Greeting: Should use First Message from assistant
   - Default Prompt: Should use System Prompt from assistant

---

## Monitoring & Iteration

After deployment, check these metrics daily:

**Call Metrics:**
- Total calls received
- Average call duration
- Hangup rate (should be <10%)
- Booking rate (track appointments booked)

**Quality Checks:**
- Listen to 1-2 call recordings daily
- Note any repeated issues
- Update System Prompt as needed
- Re-deploy when changes made

---

## Getting Help

If something isn't working:

1. **Vapi Support:** [support.vapi.ai](https://support.vapi.ai)
2. **Check Logs:** In Vapi Dashboard → Logs, see what actually happened in calls
3. **Test Again:** Always test changes before deploying
4. **Adjust Prompt:** Most issues can be fixed with System Prompt tweaks

---

## Quick Reference: Where Everything Goes

| Item | Location in Vapi |
|------|------------------|
| **First Message** | Settings → First Message field |
| **System Prompt** | Settings → System Prompt field |
| **Model** | Settings → Model dropdown |
| **Phone Numbers** | Settings → Phone Numbers |
| **Test Call** | Top menu → "Test" button |
| **View Logs** | Dashboard → Recent Calls → Click call |
| **Deploy** | Top menu → "Deploy" or "Publish" |

---

**You're all set!** Your AI booking and qualifying agent is ready to go live. 🚀
