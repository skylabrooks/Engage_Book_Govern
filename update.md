This document outlines the technical requirements and feature specifications for the "Arizona Transaction Assistant" AI. It is structured for your development team to implement the specific market differentiators identified in the research report.

---

# **Technical Implementation Guide: Arizona-Specific AI Agent Features**

**Date:** December 24, 2025
**Target Market:** Arizona Residential Real Estate (Phoenix, Tucson, Rural/Exurban)
**Core Objective:** Move beyond generic "lead qualification" to "transaction risk assessment" by integrating hyper-local regulatory data.

---

## **1. Module A: The "Solar Lease" Liability Engine**

*Competitors treat solar as a feature. We will treat it as a liability until proven otherwise. This module prevents deal collapse due to Debt-to-Income (DTI) shock.*

### **1.1 Detection Logic (NLP Layer)**

The AI must scan incoming lead inquiries and MLS listing data (via RETS/Reso Web API) for specific trigger keywords.

* **Trigger Keywords:** `Solar Lease`, `PPA`, `Power Purchase Agreement`, `Sunrun`, `Tesla`, `SolarCity`, `Transfer`, `Assumption`.
* **Action:** If detected, the AI temporarily suspends generic nurture scripts and enters the **"Solar Liability Protocol."**

### **1.2 The "Solar Liability" Script Flow**

The developer must program the AI to ask these specific qualifying questions *before* booking the appointment:

1. *"I see this home has solar. Do you know if it is **owned** or **leased**?"*
2. *(If Leased):* *"Okay. To avoid surprises later, are you comfortable taking over a solar lease payment? Lenders count this against your DTI. We need to check if there is an **escalator clause** (where payments rise 2.9% annually)."*

### **1.3 Technical Requirement: Document Parsing (OCR)**

* **Feature:** "Lease Scanner"
* **Implementation:** Allow agents/users to upload a PDF of the solar contract.
* **Tech Stack:** Use an OCR/LLM pipeline (e.g., Azure Document Intelligence or OpenAI Vision API).
* **Extraction Targets:**
* `Monthly Payment` (Current)
* `Escalator Clause` (Yes/No + %)
* `Buyout Amount` (If applicable)
* `Transfer Fee` ($ Amount)


* **Output:** Return a JSON summary to the CRM: `{"solar_status": "leased", "escalator": "true", "risk": "high"}`.

---

## **2. Module B: Water Rights & AMA Due Diligence Bot**

*Generic bots cannot distinguish between a home with a 100-year water supply and a "Wildcat" subdivision relying on hauled water. This is a critical liability shield for agents.*

### **2.1 GIS Integration Strategy**

The AI must perform a "Point-in-Polygon" lookup for every property address discussed.

* **Data Source:** **Arizona Department of Water Resources (ADWR)** GIS Data.
* *Target Layer 1:* **Active Management Areas (AMAs)** (Phoenix, Pinal, Tucson, Prescott, Santa Cruz).
* *Target Layer 2:* **Assured Water Supply (AWS)** determinations.
* *Target Layer 3:* **Unincorporated/Wildcat** zones (e.g., Rio Verde Foothills, New River).



### **2.2 Logic Tree**

* **If** `Location` is inside `Phoenix AMA` AND `AWS` = `True` -> **Status:** Safe.
* **If** `Location` is inside `Rio Verde Foothills` OR `New River` -> **Status:** **CRITICAL FLAG**.
* **Trigger Script:** *"Just a heads up on that area—it's outside the municipal water zone. Many homes there rely on **hauled water** or **shared wells**. Are you open to managing a hauled water system, or should we stick to city water?"*

### **2.3 Developer Action Item**

* Scrape/Ingest ADWR shapefiles or connect to their ArcGIS REST endpoint (if public).
* Build a microservice that accepts `Lat/Long` and returns `Water_Source_Type`.

---

## **3. Module C: HOA & STR (Short-Term Rental) Analyzer**

*Investors are your highest-value leads, but they are terrified of buying in HOAs that ban Airbnbs. Automate the "CC&R Review."*

### **3.1 The "Renting Restrictions" RAG System**

Use **Retrieval-Augmented Generation (RAG)** to query HOA documents instantly.

* **Knowledge Base:** Pre-load the **Arizona Condominium Act** and **A.R.S. § 33-1806.01** (Rental property restrictions).
* **User Upload:** Allow agent to upload specific HOA CC&Rs (Covenants, Conditions, and Restrictions).

### **3.2 Query Logic**

The agent should be able to ask the bot: *"Does the Silverstone HOA allow 3-day rentals?"*

* **System Instruction:** Search for keywords: `Minimum Lease Term`, `Transient`, `30 days`, `Commercial Use`.
* **Output Format:** *"Yes/No. The CC&Rs (Page 42, Section 3) specify a **minimum lease term of 30 days**, effectively banning Airbnb style rentals."*

---

## **4. Module D: The "Spanglish" & Cultural Persona**

*Standard translation APIs result in "Castilian" (Spain) Spanish, which sounds alien to the Arizona/Sonoran market. We need "Southwestern" code-switching.*

### **4.1 System Prompt Engineering**

Do not use standard "Translate to Spanish." Use a targeted persona prompt.

* **Prompt Instruction:** *"You are a helpful real estate assistant in Phoenix, Arizona. You speak fluent 'Spanglish' common to the US Southwest. You are comfortable code-switching (mixing English and Spanish) if the user does. Avoid formal 'Usted' unless the user is very formal. Avoid Castilian terms like 'Vosotros' or 'Coche' (use 'Carro')."*

### **4.2 Cultural Vocabulary Mapping**

Train the model to recognize and tag specific cultural housing needs in the CRM:

* `"Casita"` / `"Suegra Unit"` -> Tag as: **Multi-Generational Potential**.
* `"Nana's Room"` -> Tag as: **Main Floor Bedroom**.
* `"Horse Property"` -> Tag as: **Zoning/Land Use Check Required**.

---

## **5. Integration Architecture (The "Paper Trail")**

*The AI cannot live on an island. It must push its risk assessments into the agent's CRM.*

### **5.1 CRM Field Mapping (Lofty / Follow Up Boss / HighLevel)**

The developer must create custom fields via API in the target CRM:

* `Risk_Solar_Lease` (Boolean)
* `Risk_Water_Source` (Enum: Municipal, Private Well, Shared Well, Hauled)
* `Risk_HOA_Rental_Cap` (Boolean)

### **5.2 The "Handoff" Note**

When a lead is ready for a human agent, the AI must generate a **Risk Summary Note**:

> **AI Handoff Summary:**
> * **Lead:** John Doe
> * **Interest:** 123 Desert Lane, New River, AZ
> * **⚠️ RISK ALERT:** Property is in a hauled water zone. Lead confirmed they are *aware* and *okay* with this.
> * **⚠️ RISK ALERT:** Solar lease detected. Lead has *not* been qualified for the $180/mo payment.
> * **Action:** Please discuss solar transfer requirements on the call.
> 
> 

---

## **6. Rapid Development Roadmap (MVP)**

1. **Week 1:** **Prompt Engineering.** Build the "Arizona Persona" (Spanglish + Solar/Water knowledge) in a playground environment (OpenAI/Anthropic).
2. **Week 2:** **ADWR Data Scrape.** Locate and index the Arizona water service maps. Build the simple "Am I in a water zone?" lookup tool.
3. **Week 3:** **CRM Integration.** Connect the bot to GoHighLevel or Follow Up Boss API to test the "Risk Tagging" feature.
4. **Week 4:** **Beta Test.** Deploy with 5 agents in "Fringe" markets (e.g., San Tan Valley, Maricopa) where solar and USDA loans are common.