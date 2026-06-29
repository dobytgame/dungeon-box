-- Contagem de visitas em links de indicação (?ref=DB-XXXXXX)

ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS total_visits integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_referral_link_visit(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_codes
  SET total_visits = total_visits + 1
  WHERE upper(code) = upper(trim(p_code))
    AND code ~ '^DB-[A-Z0-9]{6}$';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION increment_referral_link_visit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_referral_link_visit(text) TO service_role;
