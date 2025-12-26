-- Usage tracking table for per-agent billing and monitoring
-- Tracks OCR scans, Vapi minutes, API calls for each agent

CREATE TABLE agent_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'solar_ocr_scan', 'vapi_call_minutes', 'water_lookup', 'hoa_query'
  metric_value DECIMAL(10, 2) NOT NULL, -- e.g., 1 scan, 4.5 minutes, 1 lookup
  cost_usd DECIMAL(10, 4) DEFAULT 0, -- Calculated cost for this metric
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}', -- Additional context (document_url, call_id, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast aggregation queries
CREATE INDEX idx_agent_usage_agent_id ON agent_usage_metrics(agent_id);
CREATE INDEX idx_agent_usage_metric_type ON agent_usage_metrics(metric_type);
CREATE INDEX idx_agent_usage_created_at ON agent_usage_metrics(created_at);
CREATE INDEX idx_agent_usage_agent_month ON agent_usage_metrics(agent_id, date_trunc('month', created_at));

-- RLS: Agents can only see their own usage
ALTER TABLE agent_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own usage metrics"
  ON agent_usage_metrics FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "System can insert usage metrics"
  ON agent_usage_metrics FOR INSERT
  WITH CHECK (true); -- Service role only

-- View for monthly usage summary
CREATE OR REPLACE VIEW agent_monthly_usage AS
SELECT 
  agent_id,
  date_trunc('month', created_at) AS month,
  metric_type,
  COUNT(*) AS event_count,
  SUM(metric_value) AS total_value,
  SUM(cost_usd) AS total_cost_usd
FROM agent_usage_metrics
GROUP BY agent_id, date_trunc('month', created_at), metric_type;

-- Comments
COMMENT ON TABLE agent_usage_metrics IS 'Per-agent usage tracking for billing and monitoring';
COMMENT ON COLUMN agent_usage_metrics.metric_type IS 'Type of billable event (solar_ocr_scan, vapi_call_minutes, etc.)';
COMMENT ON COLUMN agent_usage_metrics.cost_usd IS 'Calculated cost in USD for this metric event';
