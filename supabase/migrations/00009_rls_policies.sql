-- Row Level Security

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_levels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes              ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (true);

CREATE POLICY "loyalty_public_read" ON loyalty_levels
  FOR SELECT USING (true);

CREATE POLICY "themes_public_read" ON themes
  FOR SELECT USING (is_revealed = true);

-- Perfis (insert via trigger handle_new_user SECURITY DEFINER)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Endereços
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Assinaturas
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ciclos e pagamentos (escrita via service role nos webhooks)
CREATE POLICY "cycles_select_own" ON subscription_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Votos
CREATE POLICY "votes_select_own" ON theme_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "votes_insert_own" ON theme_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_own" ON theme_votes
  FOR DELETE USING (auth.uid() = user_id);
