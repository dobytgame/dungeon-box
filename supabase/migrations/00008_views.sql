-- Views operacionais

CREATE VIEW active_subscribers WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.email,
  pl.name        AS plan_name,
  pl.price_cents AS plan_price,
  s.status,
  s.current_cycle,
  s.loyalty_level,
  ll.name        AS loyalty_name,
  s.next_billing_date,
  s.started_at
FROM subscriptions s
JOIN profiles p  ON p.id = s.user_id
JOIN plans pl    ON pl.id = s.plan_id
JOIN loyalty_levels ll ON ll.level = s.loyalty_level
WHERE s.status = 'active';

CREATE VIEW mrr WITH (security_invoker = true) AS
SELECT
  pl.name,
  COUNT(s.id)               AS subscribers,
  SUM(pl.price_cents) / 100 AS mrr_brl
FROM subscriptions s
JOIN plans pl ON pl.id = s.plan_id
WHERE s.status = 'active'
GROUP BY pl.name;
