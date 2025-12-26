-- RLS policies for agent_usage_metrics and risk_assessments
-- Ensures agents can only view their own usage and risk data

-- Enhance RLS on existing tables that need agent isolation

-- risk_assessments: agents see only their own
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own risk assessments"
  ON risk_assessments FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages all risk assessments"
  ON risk_assessments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents update own risk assessments"
  ON risk_assessments FOR UPDATE
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- agent_usage_metrics: agents see only their own usage
ALTER TABLE agent_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own usage metrics"
  ON agent_usage_metrics FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Service role inserts usage metrics"
  ON agent_usage_metrics FOR INSERT
  WITH CHECK (true);

-- tags table: agents see their own tags (already scoped by agent_id in design)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own tags"
  ON tags FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents manage own tags"
  ON tags FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- lead_tags: agents see tags on their own leads
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view tags on own leads"
  ON lead_tags FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));

CREATE POLICY "Agents tag own leads"
  ON lead_tags FOR INSERT
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));

-- property_tags: agents see tags on their own properties
ALTER TABLE property_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view tags on own properties"
  ON property_tags FOR SELECT
  USING (property_id IN (SELECT id FROM properties WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));

CREATE POLICY "Agents tag own properties"
  ON property_tags FOR INSERT
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));

-- hoa_documents: scoped to agent (if used in future)
-- ALTER TABLE hoa_documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Agents view own HOA documents"
--   ON hoa_documents FOR SELECT
--   USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
