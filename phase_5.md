# **Phase 5 Logic Implementation: A Comprehensive Framework for Seeding Supabase in Serverless Voice Architectures**

## **1\. Introduction: The Strategic Imperative of Data Seeding in Voice AI**

The deployment of autonomous Voice AI agents within the real estate sector represents a paradigmatic shift from static, menu-driven IVR (Interactive Voice Response) systems to dynamic, state-aware conversational interfaces. As specifically applied to the Arizona real estate market, the objective is to create a multi-tenant subscription platform where individual Real Estate Agents (the subscribers) utilize a centralized AI infrastructure to manage lead generation, property information dissemination, and appointment setting. This architecture relies on a seamless orchestration between the voice layer—provided by Vapi.ai—and the state management layer—hosted on Supabase.

Phase 5 of the implementation lifecycle, "Logic Implementation," is widely regarded as the most critical juncture in system development. It is here that the abstract architectural diagrams translate into executable code. However, a common failure mode in the development of AI assistants is the premature writing of logic code against an empty or malformed database. Without a rigorously populated database containing high-fidelity test data, the logic layer (which typically resides in Edge Functions or a Node.js server) has nothing to interrogate. It cannot test the retrieval of property details from RentCast, the allocation of calendar slots via Cal.com, or the routing of notifications to Discord.

Therefore, the first step of Phase 5—Populating the Supabase Database—is not merely a data entry task; it is the construction of a simulation environment. This report provides an exhaustive, expert-level analysis and step-by-step guide to populating a Supabase backend specifically designed to support a Vapi.ai Real Estate Assistant. The strategy detailed herein ensures compliance with the user's specific constraints: avoiding 10DLC (texting) compliance by leveraging Discord, utilizing RentCast for property intelligence, and enabling a subscription-based business model.

### **1.1 The Role of Deterministic State in AI Conversations**

In a stateless voice environment, "intelligence" is synonymous with "context retrieval." When a lead calls a Real Estate Agent's AI number, the Vapi assistant is initially a blank slate. To appear intelligent, it must instantly query the Supabase backend to answer:

1. **Identity Resolution:** Who is calling? (A new lead? A returning investor? A vendor?)  
2. **Tenancy Resolution:** Which Real Estate Agent owns this phone number? (Critical for a subscription model).  
3. **Contextual Availability:** What properties is this agent currently listing? (Data derived from RentCast).  
4. **Operational Status:** Is the agent accepting appointments right now? (Data derived from Cal.com).

The test data seeded into Supabase must answer these questions deterministically. If the database contains only generic "Lorem Ipsum" placeholders, the AI's logic will fail to demonstrate the nuanced handling required for high-value real estate transactions. For instance, testing the "Lead Generation" logic requires test data that simulates a skeptical buyer (requiring persuasive property data) versus an eager seller (requiring immediate appointment booking).

### **1.2 Architectural Components and Data Flow**

The population strategy must account for the specific interplay of the chosen technology stack.

* **Vapi.ai (The Voice Interface):** The test data must align with Vapi’s specific JSON payloads, particularly the assistant-request webhook.1 The database must store mappings for phoneNumberId to specific Real Estate Agents to handle the multi-tenant routing.2  
* **Supabase (The State Machine):** As the central nervous system, Supabase will hold the relational data. We must leverage auth.users for secure agent access and public tables for lead data. The data structures must support Row Level Security (RLS) to ensure Agent A cannot see Agent B's leads.3  
* **RentCast & Cal.com (The Integrations):** While these are external APIs, the *logic testing* phase often requires "mocking" these responses in the database first to ensure stability before connecting live APIs. The seeding strategy will involve populating "cached" property data structures that mimic RentCast schemas.  
* **Discord (The Notification Layer):** Since SMS is strictly avoided to bypass 10DLC regulations, the database must store Discord Webhook URLs for each subscriber. The test data must include valid (or valid-format) Discord webhook strings to test the notification dispatch logic.

## ---

**2\. Schema Design and Data Modeling for Real Estate AI**

Before a single row of data can be inserted, the database schema must be modeled to support the complex relationships of a real estate subscription platform. Unlike a single-user application, a subscription platform acts as a B2B2C (Business to Business to Consumer) system. You (the platform owner) sell to Agents (the Business), who serve Leads (the Consumer). The test data must reflect this three-tier hierarchy.

### **2.1 The Multi-Tenant Identity Model**

The primary entity in Supabase is the User. However, in this architecture, we have two distinct types of "Users":

1. **The Subscriber (Real Estate Agent):** This user logs into the dashboard to pay their subscription and view leads. They exist in auth.users and have a detailed profile in public.agents.  
2. **The Lead (Caller):** This user calls the phone number. They may *not* have a login (no auth.users entry initially) but must have a persistent record in public.leads or public.contacts to track conversation history.

**Table 1: Entity-Relationship Definition for Seeding**

| Entity Table | Supabase Schema | Purpose in Vapi Logic | Critical Fields for Seeding |
| :---- | :---- | :---- | :---- |
| auth.users | auth | Authentication for Agents (Subscribers). | id (UUID), email (Agent's login), user\_metadata (Role). |
| public.agents | public | Profile data injected into Vapi system prompt. | id (FK), full\_name, license\_number, cal\_dot\_com\_link, rentcast\_api\_key (if BYO), discord\_webhook\_url. |
| public.phone\_mappings | public | Maps a Vapi Phone Number to an Agent. | vapi\_phone\_number\_id (PK), agent\_id (FK), welcome\_message\_override. |
| public.properties | public | Cache of RentCast data for fast retrieval. | address, valuation\_low, valuation\_high, beds, baths, agent\_id (FK). |
| public.leads | public | Tracks people calling the AI. | phone\_number (E.164), last\_called\_at, lead\_score, assigned\_agent\_id (FK). |
| public.interactions | public | Log of Vapi calls for context. | vapi\_call\_id, transcript\_summary, sentiment, discord\_notification\_sent (Boolean). |

### **2.2 Designing for Vapi Compatibility**

Vapi's architecture dictates specific constraints on the data.

* **E.164 Phone Formatting:** Vapi variables like {{customer.number}} strictly follow the E.164 standard (e.g., \+19283259142). All test data in public.leads and public.agents must adhere to this format to ensure the logic layer's SQL queries (SELECT \* FROM leads WHERE phone \= $1) succeed.5  
* **Phone Number ID Resolution:** Vapi call logs often reference the phoneNumberId rather than the number itself.6 To make the AI "Multi-Tenant," we assign a unique Vapi Phone Number to each Real Estate Agent. The test data must explicitly map phoneNumberId "A" to Agent "Alice" and phoneNumberId "B" to Agent "Bob." This allows the single logic codebase to dynamically switch context based on which number was dialed.

### **2.3 Designing for Discord Integration**

The avoidance of 10DLC requires a robust alternative notification channel. Discord webhooks are the chosen transport.

* **Schema Requirement:** The public.agents table must contain a column discord\_webhook\_url.  
* **Test Data Nuance:** For the test data to be valid, we cannot just put "[http://discord.com](http://discord.com)" as a placeholder. The logic layer will likely use regex validation to ensure the URL matches the pattern https://discord.com/api/webhooks/.... The seeded data must match this pattern to pass validation checks during logic execution.

### **2.4 Designing for RentCast and Cal.com**

* **RentCast:** Real-time API calls introduce latency. For the "Logic Implementation" phase, it is best practice to seed a public.properties table with "Mock" RentCast data. This allows you to test the AI's ability to *speak* property details (e.g., "This home has 3 beds and 2 baths") without debugging the external API connection simultaneously.  
* **Cal.com:** Similarly, the agent's booking link (e.g., https://cal.com/agent-name/30min) should be stored in public.agents. The test data should verify that different agents have different booking links, ensuring the AI sends the lead to the correct calendar.

## ---

**3\. Step-by-Step Implementation: The Data Population Strategy**

The following section details the precise operational steps to populate the database. We will move from the foundational system configuration to the specific user data. We will utilize the Supabase JS Client with the SERVICE\_ROLE\_KEY to bypass Row Level Security restrictions during this administrative setup.7

**Prerequisite:** Ensure you have your Supabase URL and Service Role Key. *Warning: The Service Role Key allows full database access and should never be exposed in a client-side app.*

### **Step 1: Initialize the Seeding Environment**

Create a local script file (e.g., seed\_real\_estate\_agent.js). This script will act as the "God Mode" administrator, creating the universe in which your agents will operate.

JavaScript

// seed\_real\_estate\_agent.js  
import { createClient } from '@supabase/supabase-js';

// Use environment variables for security  
const SUPABASE\_URL \= process.env.SUPABASE\_URL;  
const SERVICE\_ROLE\_KEY \= process.env.SUPABASE\_SERVICE\_ROLE\_KEY;

const supabase \= createClient(SUPABASE\_URL, SERVICE\_ROLE\_KEY, {  
  auth: {  
    autoRefreshToken: false,  
    persistSession: false  
  }  
});

console.log("Initializing Seeding Sequence for Arizona Real Estate Agents...");

### **Step 2: Seeding the "Subscriber" (Real Estate Agent)**

We need to create at least two distinct agents to test the multi-tenant capabilities.

* **Agent 1 (Phoenix Specialist):** "Sarah Connor" – Focuses on high-volume listings.  
* **Agent 2 (Sedona Luxury):** "John Rambo" – Focuses on luxury, off-market deals.

Phase 2a: Create Auth Users  
We use admin.createUser to generate the auth.users records. This generates the UUIDs we need for foreign keys.

JavaScript

async function seedAgents() {  
  const agents \=;

  for (const agent of agents) {  
    const { data, error } \= await supabase.auth.admin.createUser({  
      email: agent.email,  
      password: agent.password,  
      email\_confirm: true,  
      user\_metadata: agent.metadata  
    });

    if (error) {  
      console.error(\`Failed to create ${agent.email}:\`, error.message);  
    } else {  
      console.log(\`Created Auth User: ${agent.email}\`);  
      // Pass this UUID to the next function to create the public profile  
      await createAgentProfile(data.user.id, agent);  
    }  
  }  
}

Phase 2b: Create Public Agent Profiles (The Subscription Context)  
Now we populate the public.agents table. This is where the integrations live.

* **Vapi Context:** We need to link the specific phoneNumberId you bought (1-928-325-9142) to one of these agents.  
* **Discord Context:** We inject the Discord Webhook URL.  
* **Cal.com Context:** We inject the booking link.

JavaScript

async function createAgentProfile(userId, agentData) {  
  // Logic to determine which agent gets the "Real" Vapi number for testing  
  // Assuming Sarah gets the live number: 1 (928) 325 9142  
  const isLiveTestAgent \= agentData.email.includes('sarah');  
    
  const profile \= {  
    id: userId, // Foreign Key to auth.users  
    full\_name: agentData.metadata.full\_name,  
    agency\_name: isLiveTestAgent? 'Phoenix Premier Realty' : 'Sedona Luxury Estates',  
    phone\_number: isLiveTestAgent? '+19283259142' : '+16025550199', // E.164 Format  
      
    // Discord Integration  
    discord\_webhook\_url: isLiveTestAgent   
     ? 'https://discord.com/api/webhooks/123456789/token\_for\_sarah\_channel'   
      : 'https://discord.com/api/webhooks/987654321/token\_for\_john\_channel',  
        
    // Cal.com Integration  
    booking\_link: isLiveTestAgent   
     ? 'https://cal.com/sarah-realty/listing-consult'   
      : 'https://cal.com/john-luxury/private-viewing',  
        
    // Subscription Status  
    subscription\_tier: 'professional', // Used to gate features in logic  
    is\_active: true  
  };

  const { error } \= await supabase.from('agents').insert(profile);  
    
  if (error) console.error('Profile creation failed:', error);  
  else console.log(\`Public Profile seeded for ${agentData.metadata.full\_name}\`);  
}

### **Step 3: Seeding the Vapi Phone Number Mapping**

This step is critical for the logic layer. When Vapi sends a webhook, it includes the phoneNumberId.6 The logic must instantly know "Phone ID X belongs to Agent Sarah."

You mentioned you secured the number 1 (928) 325 9142\. You need to find its **ID** in the Vapi Dashboard (usually starts with phone-number-xxxxxxxx).

JavaScript

async function seedPhoneMappings(agentId) {  
  // This ID comes from your Vapi Dashboard  
  const VAPI\_REAL\_PHONE\_ID \= 'phone-number-a1b2c3d4-e5f6'; 

  const mapping \= {  
    vapi\_phone\_number\_id: VAPI\_REAL\_PHONE\_ID,  
    agent\_id: agentId,  
    label: 'Main Inbound Line \- Phoenix',  
      
    // Logic Configuration  
    // If we want to override the system prompt specifically for this line  
    prompt\_override: "You are an assistant for Sarah Connor. Focus on selling subscriptions."   
  };

  const { error } \= await supabase.from('phone\_mappings').insert(mapping);  
}

**Insight:** By extracting the prompt\_override into the database, you allow the agent to update their "Persona" without you needing to redeploy code. This is a key feature for the subscription model.

### **Step 4: Seeding "Mock" RentCast Property Data**

To test the "Property Information Provider" aspect of your user query, the AI needs data to talk about. While the production system will hit the RentCast API, the development environment should use cached data in Supabase to save API credits and latency.

We will populate a public.properties table that mimics the RentCast JSON structure.

**RentCast Mock Data Structure:**

* Address: 1234 Desert Bloom Ln, Phoenix, AZ  
* Stats: 3 Bed, 2 Bath, 1800 SqFt.  
* Valuation: $450,000 (Zestimate style).

JavaScript

async function seedProperties(agentId) {  
  const properties \=  
      },  
      valuation\_data: {  
        price: 450000,  
        rent\_estimate: 2200,  
        last\_updated: new Date().toISOString()  
      },  
      status: 'active'  
    },  
    {  
      agent\_id: agentId,  
      address\_full: '555 Cactus Flower Rd, Scottsdale, AZ 85251',  
      details\_json: {  
        bedrooms: 4,  
        bathrooms: 3.5,  
        squareFootage: 2800,  
        yearBuilt: 2020,  
        features: \['Gated Community', 'Golf Course View'\]  
      },  
      valuation\_data: {  
        price: 850000,  
        rent\_estimate: 4500,  
        last\_updated: new Date().toISOString()  
      },  
      status: 'pending' // Test logic for "Sorry, this home is under contract"  
    }  
  \];

  const { error } \= await supabase.from('properties').insert(properties);  
}

**Reasoning:** This data allows you to test specific conversational flows.

* *User:* "Is the house on Cactus Flower available?"  
* *AI Logic:* Queries properties table \-\> Checks status: pending \-\> Returns "I'm sorry, that property is currently pending, but I have another one on Desert Bloom..."  
* Without this seeded status data, you cannot test the "Cross-Selling" logic.

### **Step 5: Seeding "Leads" and Interaction History**

Finally, we must simulate the people calling the system. We need to test how the AI handles "New Leads" vs. "Returning Leads."

Scenario 1: The Unknown Caller (New Lead)  
We do not seed a record for this. The absence of data is the test case. The logic must detect SELECT \* FROM leads returns NULL, and then execute an INSERT to create the lead.  
Scenario 2: The Returning Investor  
We seed a lead who has called before.

JavaScript

async function seedLeads() {  
  const knownLead \= {  
    id: 'uuid-for-lead-1',  
    phone\_number: '+16025559988', // Must be E.164 to match Vapi SIP header  
    first\_name: 'Mike',  
    last\_name: 'Investor',  
    lead\_score: 85, // Hot lead  
    notes: 'Looking for multi-family homes in Tempe.',  
    created\_at: new Date(Date.now() \- 86400000).toISOString() // Created yesterday  
  };

  const { error } \= await supabase.from('leads').insert(knownLead);  
}

## ---

**4\. Deep Dive: Configuring Discord Notification Data**

Since you are strictly avoiding 10DLC (SMS), Discord is your lifeline for real-time alerts. The database must support the *testing* of this notification pipeline.

### **4.1 The Discord Data Model**

You need to store the webhook URL securely. In a multi-tenant system, each Agent might have their own Discord server, or you might have one central server with different Channels for each agent.

* **Approach A (Central Server):** You control the Discord. You create a channel \#leads-sarah and \#leads-john. You generate a webhook for each channel.  
* **Approach B (Agent Server):** The agent gives you their webhook.

For this Logic Implementation report, we assume Approach A for simplicity and control.

### **4.2 Validating the Seeded URL**

The logic layer will likely use a fetch() call to the stored URL. If the seeded URL is null or invalid, the logic crashes.

* **Test Data Constraint:** The seeded discord\_webhook\_url must be a valid structure.  
* **Mocking for Local Dev:** If you don't want to spam a real Discord channel while testing, you can seed the URL with a service like webhook.site.  
  * *Action:* Go to webhook.site, get a unique URL.  
  * *Seed:* Update public.agents set discord\_webhook\_url \= '[https://webhook.site/](https://webhook.site/)...'  
  * *Benefit:* You can view the JSON payload the AI sends (e.g., "New Lead: Mike Investor") on the webhook.site dashboard, confirming the logic works without setting up a Discord server yet.

## ---

**5\. Integrating Vapi Webhook Logic with Seeded Data**

Now that the data is populated, we must analyze how the Vapi assistant-request maps to this data. This confirms that our seeding strategy was correct.

### **5.1 The assistant-request Payload Analysis**

When a call hits your Vapi number, Vapi sends this JSON 1:

JSON

{  
  "message": {  
    "type": "assistant-request",  
    "call": {  
      "phoneNumberId": "phone-number-a1b2c3d4...",   
      "customer": {  
        "number": "+16025559988"  
      }  
    }  
  }  
}

### **5.2 The Logic Flow (Validated by Test Data)**

1. **Extract phoneNumberId**: The logic receives phone-number-a1b2c3d4....  
2. **Query phone\_mappings**:  
   * *Query:* SELECT agent\_id FROM phone\_mappings WHERE vapi\_phone\_number\_id \= 'phone-number-a1b2c3d4...'  
   * *Result:* Returns Sarah's UUID (seeded in Step 3).  
   * *Failure Mode:* If this table is empty, the call fails. **Seeding Step 3 is mandatory.**  
3. **Extract customer.number**: The logic receives \+16025559988.  
4. **Query leads**:  
   * *Query:* SELECT \* FROM leads WHERE phone\_number \= '+16025559988'  
   * *Result:* Returns "Mike Investor" (seeded in Step 5).  
5. **Construct System Prompt**:  
   * *Logic:* "You are Sarah's assistant. You are speaking to Mike Investor. He likes multi-family homes in Tempe."  
   * *Result:* The AI greets Mike by name. This proves the "State-Aware" logic is working.

## ---

**6\. Addressing Specific Requirements and Nuances**

### **6.1 RentCast Integration Strategy**

You specified using RentCast. While Phase 5 involves logic, you need to ensure the database can *cache* RentCast data. RentCast APIs have rate limits.

* **Requirement:** The database must have a last\_fetched\_at column in public.properties.  
* **Seeding Implication:** When seeding the mock property "1234 Desert Bloom," set last\_fetched\_at to NOW(). This tells the logic "This data is fresh, do not call the RentCast API."  
* **Test Case:** Seed another property with last\_fetched\_at \= NOW() \- INTERVAL '30 days'. This allows you to test the logic branch: "Data is stale \-\> Call RentCast API \-\> Update Database."

### **6.2 Cal.com Availability Mocking**

You are using Cal.com for appointments. The AI needs to know *when* to book.

* **Challenge:** The AI shouldn't just offer a link; highly effective agents (your selling point) check availability first.  
* **Seeding for Logic:** While you can't seed the live availability (that's an API call), you *can* seed the **Agent's Preferences**.  
* **Table:** public.agent\_schedules  
  * *Seed:* agent\_id: Sarah, preferred\_meeting\_type: 'phone', buffer\_time: 15 (minutes).  
  * *Logic:* This allows the AI to say "Sarah usually takes calls in the afternoon" based on seeded preferences, adding a layer of personalization before the Cal.com link is even sent.

### **6.3 10DLC Avoidance via Discord**

The user query emphasizes 10DLC avoidance. The database setup must reflect this permanence.

* **Validation:** Ensure there are *no* columns in public.agents for twilio\_sid or messaging\_service\_id. The absence of these columns enforces the architectural decision to never send SMS.  
* **Notification Log:** Create a table public.discord\_logs.  
  * *Purpose:* To prove to your subscribers (Agents) that you sent the lead.  
  * *Seed:* Populate a few dummy logs.  
  * *Fields:* lead\_id, discord\_message\_id, sent\_at.  
  * *Value:* When you build the Dashboard for the agents, they can see "Notification Sent to Discord at 2:00 PM."

## ---

**7\. Validation: Testing the Populated Database**

Once the scripts from Section 3 have run, you must verify the integrity of the data using the Supabase SQL Editor.

### **7.1 Verification Queries**

Query 1: The "Incoming Call" Simulation  
Run this to see if you can resolve an Agent from the Phone Number ID you possess.

SQL

SELECT   
  a.full\_name,   
  a.agency\_name,   
  pm.label   
FROM public.agents a  
JOIN public.phone\_mappings pm ON a.id \= pm.agent\_id  
WHERE pm.vapi\_phone\_number\_id \= 'your-vapi-phone-id';

*Expected Result:* Sarah Connor / Phoenix Premier Realty.

Query 2: The "Property Lookup" Simulation  
Run this to ensure RentCast data is retrievable.

SQL

SELECT   
  address\_full,   
  valuation\_data\-\>\>'price' as price   
FROM public.properties   
WHERE agent\_id \= (SELECT id FROM public.agents WHERE email \= 'sarah.connor@realty-az.com')  
AND status \= 'active';

*Expected Result:* 1234 Desert Bloom / 450000\.

Query 3: The "Discord Configuration" Check  
Run this to ensure no agent has a NULL webhook (which would break the notification logic).

SQL

SELECT count(\*)   
FROM public.agents   
WHERE discord\_webhook\_url IS NULL;

*Expected Result:* 0\.

## ---

**8\. Conclusion and Transition to Phase 5b**

The successful execution of this data population strategy marks the completion of Phase 5, Step 1\. You have moved from an empty shell to a fully simulated environment that mirrors the Arizona real estate market.

**Summary of Accomplishments:**

1. **Multi-Tenancy Established:** By seeding auth.users and public.agents separately, you have enabled a subscription model where multiple agents can use the platform securely.  
2. **Vapi Integration Primed:** The phone\_mappings table ensures that when 1 (928) 325 9142 rings, the system identifies it as Sarah's line, not John's.  
3. **Mock Data for APIs:** The public.properties table mimics RentCast, allowing you to refine the AI's property descriptions without incurring API costs.  
4. **Regulatory Compliance:** The schema explicitly supports Discord webhooks and omits SMS infrastructure, adhering to the no-10DLC constraint.

Next Steps (Logic Implementation):  
With this data in place, you are ready to write the Edge Function logic. The next phase involves writing the TypeScript code that executes the SQL queries defined in Section 7, retrieves the JSON data, formats it for the Vapi assistant-request response, and dynamically instructs the AI to "act as Sarah" and "sell the property on Desert Bloom." The database is no longer a passive store; it is the active memory of your AI agent.

## ---

**9\. Appendix: Schema Reference for "ebookgov.com" Implementation**

**Table: public.agents**

* id (uuid, PK, FK \-\> auth.users.id)  
* full\_name (text)  
* discord\_webhook\_url (text, nullable)  
* cal\_com\_link (text, nullable)  
* rentcast\_api\_key (text, encrypted, nullable \- allows agents to bring their own key)  
* subscription\_status (enum: 'trial', 'active', 'churned')

**Table: public.phone\_mappings**

* vapi\_phone\_id (text, PK)  
* agent\_id (uuid, FK \-\> public.agents.id)  
* context\_label (text, e.g., "Zillow Ad \#1")

**Table: public.leads**

* id (uuid, PK)  
* phone\_number (text, E.164, unique per agent)  
* agent\_id (uuid, FK \-\> public.agents.id)  
* last\_interaction\_at (timestamptz)  
* notes (text)

**Table: public.properties**

* id (uuid, PK)  
* agent\_id (uuid, FK)  
* address\_normalized (text)  
* rentcast\_json (jsonb)  
* last\_updated (timestamptz)

#### **Works cited**

1. Connect \- No Agent \- Vapi, accessed December 23, 2025, [https://vapi.ai/community/m/1240135241520255057](https://vapi.ai/community/m/1240135241520255057)  
2. Get Phone Number | Vapi, accessed December 23, 2025, [https://docs.vapi.ai/api-reference/phone-numbers/get](https://docs.vapi.ai/api-reference/phone-numbers/get)  
3. User Management | Supabase Docs, accessed December 23, 2025, [https://supabase.com/docs/guides/auth/managing-user-data](https://supabase.com/docs/guides/auth/managing-user-data)  
4. Users | Supabase Docs, accessed December 23, 2025, [https://supabase.com/docs/guides/auth/users](https://supabase.com/docs/guides/auth/users)  
5. Get caller phone number \- VAPI, accessed December 23, 2025, [https://vapi.ai/community/m/1364523035604025404](https://vapi.ai/community/m/1364523035604025404)  
6. In Call Logs, Assistant Phone Number is displaying Phone Number ID \- VAPI, accessed December 23, 2025, [https://vapi.ai/community/m/1377286083988951154](https://vapi.ai/community/m/1377286083988951154)  
7. JavaScript: Retrieve a user | Supabase Docs, accessed December 23, 2025, [https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid](https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid)  
8. Vapi AI Tutorial: How to Get International Phone Numbers with Twilio \- YouTube, accessed December 23, 2025, [https://www.youtube.com/watch?v=goYfTTE4UBY](https://www.youtube.com/watch?v=goYfTTE4UBY)