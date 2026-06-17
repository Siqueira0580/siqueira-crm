-- ============================================================
-- SIQUEIRA CRM — CAPTAÇÃO DE LEADS VIA LINK PÚBLICO
-- Execute no Supabase SQL Editor
-- ============================================================

-- Permitir que usuários anônimos insiram leads na tabela clientes
-- A condição WITH CHECK garante que só podem inserir leads (etapa_funil = 'lead_novo')
CREATE POLICY "anon_lead_capture_insert" ON clientes
  FOR INSERT
  TO anon
  WITH CHECK (etapa_funil = 'lead_novo');

-- Permitir leitura pública do profile do corretor
-- (para exibir nome/empresa na landing page de captação)
CREATE POLICY "public_read_profiles" ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- ⚠️ Se já houver uma policy de leitura de profiles, pode conflitar.
--    Verifique com: SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
--    E remova a antiga: DROP POLICY IF EXISTS "nome_da_policy_antiga" ON profiles;
