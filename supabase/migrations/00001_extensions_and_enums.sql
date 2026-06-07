-- DungeonBox · enums e extensões base

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE subscription_status AS ENUM (
  'pending',
  'active',
  'paused',
  'past_due',
  'cancelled',
  'expired'
);

CREATE TYPE cycle_status AS ENUM (
  'upcoming',
  'preparing',
  'shipped',
  'delivered',
  'failed'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'approved',
  'authorized',
  'in_process',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back'
);
