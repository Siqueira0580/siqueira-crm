-- ============================================================
-- SIQUEIRA CRM — MÓDULO EQUIPE (Múltiplos Corretores)
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Função RPC que retorna estatísticas por corretor (só admins podem chamar)
--    SECURITY DEFINER = roda com permissões do dono da função, bypass RLS
CREATE OR REPLACE FUNCTION get_equipe_stats()
RETURNS TABLE (
  user_id     UUID,
  nome        TEXT,
  email       TEXT,
  role        TEXT,
  created_at  TIMESTAMPTZ,
  total_clientes   BIGINT,
  clientes_ativos  BIGINT,
  fechamentos      BIGINT,
  perdidos         BIGINT,
  total_visitas    BIGINT,
  visitas_realizadas BIGINT,
  taxa_conversao   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF (SELECT p.role FROM profiles p WHERE p.id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem ver estatísticas da equipe.';
  END IF;

  RETURN QUERY
  SELECT
    p.id                                                          AS user_id,
    p.nome,
    p.email,
    p.role,
    p.created_at,
    COUNT(DISTINCT c.id)                                          AS total_clientes,
    COUNT(DISTINCT CASE WHEN c.etapa_funil NOT IN ('fechado','perdido') THEN c.id END) AS clientes_ativos,
    COUNT(DISTINCT CASE WHEN c.etapa_funil = 'fechado' THEN c.id END)  AS fechamentos,
    COUNT(DISTINCT CASE WHEN c.etapa_funil = 'perdido' THEN c.id END)  AS perdidos,
    COUNT(DISTINCT v.id)                                          AS total_visitas,
    COUNT(DISTINCT CASE WHEN v.status = 'realizado' THEN v.id END)     AS visitas_realizadas,
    CASE
      WHEN COUNT(DISTINCT c.id) > 0
        THEN ROUND(
          COUNT(DISTINCT CASE WHEN c.etapa_funil = 'fechado' THEN c.id END)::NUMERIC
          / COUNT(DISTINCT c.id) * 100, 1
        )
      ELSE 0
    END                                                           AS taxa_conversao
  FROM profiles p
  LEFT JOIN clientes c ON c.user_id = p.id
  LEFT JOIN visitas  v ON v.user_id = p.id
  GROUP BY p.id, p.nome, p.email, p.role, p.created_at
  ORDER BY fechamentos DESC, total_clientes DESC;
END;
$$;

-- 2. Políticas RLS para admin ver todos os dados
--    (opcional — sem isso a função RPC ainda funciona porque é SECURITY DEFINER)

-- Admins podem ler todos os clientes
CREATE POLICY "admin_read_all_clientes" ON clientes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins podem ler todos os imóveis
CREATE POLICY "admin_read_all_imoveis" ON imoveis
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins podem ler todas as visitas
CREATE POLICY "admin_read_all_visitas" ON visitas
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ⚠️ ATENÇÃO: Se já existir a política "Users can read own data" nas tabelas acima,
--    remova-a antes de rodar este script ou use DROP POLICY IF EXISTS:
-- DROP POLICY IF EXISTS "Users can read own data" ON clientes;
-- DROP POLICY IF EXISTS "Users can read own data" ON imoveis;
-- DROP POLICY IF EXISTS "Users can read own data" ON visitas;

-- 3. Para tornar um usuário admin, execute:
-- UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
