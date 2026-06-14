-- Mantém profiles.email alinhado ao auth.users (login social / troca de e-mail)

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_email text;
BEGIN
  resolved_email := NULLIF(
    trim(
      COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '')
    ),
    ''
  );

  IF resolved_email IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET
    email = resolved_email,
    full_name = COALESCE(
      NULLIF(
        trim(
          COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            ''
          )
        ),
        ''
      ),
      full_name
    ),
    avatar_url = COALESCE(
      NULLIF(
        trim(
          COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            ''
          )
        ),
        ''
      ),
      avatar_url
    ),
    updated_at = now()
  WHERE id = NEW.id
    AND (
      email IS DISTINCT FROM resolved_email
      OR full_name IS NULL
      OR avatar_url IS NULL
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();
