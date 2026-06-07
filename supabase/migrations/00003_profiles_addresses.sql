-- Perfis (extensão auth.users) e endereços

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  full_name       text,
  display_name    text,
  avatar_url      text,
  phone           text,
  cpf             text,
  birth_date      date,
  preferred_color text DEFAULT 'cinza-pedra',
  newsletter      boolean DEFAULT true,
  is_admin        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  label        text DEFAULT 'Principal',
  recipient    text NOT NULL,
  zip_code     text NOT NULL,
  street       text NOT NULL,
  number       text NOT NULL,
  complement   text,
  neighborhood text NOT NULL,
  city         text NOT NULL,
  state        char(2) NOT NULL,
  is_default   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX one_default_address
  ON addresses (user_id)
  WHERE is_default = true;
