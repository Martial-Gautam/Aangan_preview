CREATE TABLE suggested_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  to_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  suggested_type TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.8,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggested_owner ON suggested_relationships(owner_id);
