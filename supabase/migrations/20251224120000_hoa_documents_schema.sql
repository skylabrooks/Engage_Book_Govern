-- HOA Document Storage and RAG Schema

CREATE TABLE IF NOT EXISTS hoa_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  hoa_name TEXT NOT NULL,
  document_name TEXT NOT NULL DEFAULT 'CC&Rs',
  document_text TEXT NOT NULL,
  chunks_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hoa_documents_agent_hoa ON hoa_documents(agent_id, hoa_name);
CREATE INDEX IF NOT EXISTS idx_hoa_documents_created ON hoa_documents(agent_id, created_at DESC);

ALTER TABLE hoa_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hoa_documents_select_owner') THEN
    CREATE POLICY hoa_documents_select_owner ON hoa_documents FOR SELECT USING (auth.uid() = agent_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hoa_documents_insert_owner') THEN
    CREATE POLICY hoa_documents_insert_owner ON hoa_documents FOR INSERT WITH CHECK (auth.uid() = agent_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hoa_documents_update_owner') THEN
    CREATE POLICY hoa_documents_update_owner ON hoa_documents FOR UPDATE USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hoa_documents_delete_owner') THEN
    CREATE POLICY hoa_documents_delete_owner ON hoa_documents FOR DELETE USING (auth.uid() = agent_id);
  END IF;
END $$;
