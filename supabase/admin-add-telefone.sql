-- ============================================================
-- SIQUEIRA CRM — Adicionar campo telefone na tabela profiles
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Confirma
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
