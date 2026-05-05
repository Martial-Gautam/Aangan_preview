-- Atomic claim function: prevents race conditions when two users
-- try to claim the same person node simultaneously.
-- Uses UPDATE ... WHERE user_id IS NULL to ensure only one caller wins.

CREATE OR REPLACE FUNCTION claim_person_node(
  p_person_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE people
  SET user_id = p_user_id
  WHERE id = p_person_id
    AND user_id IS NULL;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;
