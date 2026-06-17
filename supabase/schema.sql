-- ============================================================
-- SIQUEIRA CRM IMOBILIÁRIO — SCHEMA SUPABASE
-- Cole este SQL no Supabase SQL Editor e execute
-- ============================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PERFIS DE USUÁRIO (estende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nome        TEXT,
  email       TEXT,
  role        TEXT DEFAULT 'corretor' CHECK (role IN ('corretor', 'admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users ON DELETE SET NULL,
  nome                TEXT NOT NULL,
  telefone            TEXT,
  email               TEXT,
  faixa_renda         DECIMAL,
  tipo_imovel         TEXT CHECK (tipo_imovel IN ('casa','apartamento','comercial','qualquer')),
  objetivo            TEXT CHECK (objetivo IN ('morar','investir','alugar')),
  zona_interesse      TEXT CHECK (zona_interesse IN ('Norte','Sul','Leste','Oeste','Centro')),
  cidade              TEXT,
  orcamento_min       DECIMAL,
  orcamento_max       DECIMAL,
  quartos_desejados   INTEGER,
  necessidades        TEXT[] DEFAULT '{}',
  -- Inteligência automática
  classe_economica    TEXT CHECK (classe_economica IN ('baixa','media','alta')),
  perfil_comprador    TEXT CHECK (perfil_comprador IN ('investidor','primeira_compra','upgrade','locacao_futura')),
  score_potencial     INTEGER DEFAULT 0,
  -- Pipeline
  etapa_funil         TEXT DEFAULT 'lead_novo'
                      CHECK (etapa_funil IN ('lead_novo','contato_iniciado','visita_agendada',
                                             'proposta_enviada','negociacao','fechado','perdido')),
  -- Meta
  notas               TEXT,
  historico           JSONB DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IMÓVEIS
-- ============================================================
CREATE TABLE IF NOT EXISTS imoveis (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users ON DELETE SET NULL,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  tipo          TEXT CHECK (tipo IN ('casa','apartamento','comercial')),
  valor         DECIMAL NOT NULL,
  cep           TEXT,
  logradouro    TEXT,
  numero        TEXT,
  complemento   TEXT,
  bairro        TEXT,
  cidade        TEXT,
  estado        TEXT,
  zona          TEXT CHECK (zona IN ('Norte','Sul','Leste','Oeste','Centro')),
  quartos       INTEGER,
  banheiros     INTEGER,
  vagas         INTEGER,
  area_m2       DECIMAL,
  comodidades   TEXT[] DEFAULT '{}',
  status        TEXT DEFAULT 'disponivel'
                CHECK (status IN ('disponivel','vendido','reservado')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOTOS DE IMÓVEIS
-- ============================================================
CREATE TABLE IF NOT EXISTS fotos_imoveis (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  imovel_id     UUID REFERENCES imoveis ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  storage_path  TEXT,
  ordem         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VISITAS
-- ============================================================
CREATE TABLE IF NOT EXISTS visitas (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id    UUID REFERENCES clientes ON DELETE CASCADE NOT NULL,
  imovel_id     UUID REFERENCES imoveis ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users ON DELETE SET NULL,
  data_hora     TIMESTAMPTZ NOT NULL,
  status        TEXT DEFAULT 'agendado'
                CHECK (status IN ('agendado','realizado','cancelado')),
  observacoes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATCHING (cliente ↔ imóvel)
-- ============================================================
CREATE TABLE IF NOT EXISTS matching (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id  UUID REFERENCES clientes ON DELETE CASCADE NOT NULL,
  imovel_id   UUID REFERENCES imoveis ON DELETE CASCADE NOT NULL,
  score       INTEGER DEFAULT 0,
  detalhes    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, imovel_id)
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  titulo          TEXT NOT NULL,
  mensagem        TEXT,
  tipo            TEXT,
  lida            BOOLEAN DEFAULT FALSE,
  referencia_id   UUID,
  referencia_tipo TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_imoveis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes   ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Perfil próprio - ver"      ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Perfil próprio - criar"    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Perfil próprio - editar"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- Clientes
CREATE POLICY "Clientes - ver próprios"   ON clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clientes - criar"          ON clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clientes - editar próprios" ON clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Clientes - deletar próprios" ON clientes FOR DELETE USING (auth.uid() = user_id);

-- Imóveis
CREATE POLICY "Imóveis - ver próprios"    ON imoveis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Imóveis - criar"           ON imoveis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Imóveis - editar próprios" ON imoveis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Imóveis - deletar próprios" ON imoveis FOR DELETE USING (auth.uid() = user_id);

-- Fotos (ver = todos autenticados; editar = dono do imóvel)
CREATE POLICY "Fotos - ver autenticados"  ON fotos_imoveis FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Fotos - gerenciar"         ON fotos_imoveis FOR ALL
  USING (auth.uid() = (SELECT user_id FROM imoveis WHERE id = imovel_id));

-- Visitas
CREATE POLICY "Visitas - gerenciar"       ON visitas FOR ALL USING (auth.uid() = user_id);

-- Matching
CREATE POLICY "Matching - gerenciar"      ON matching FOR ALL
  USING (auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id));

-- Notificações
CREATE POLICY "Notif - ver próprias"      ON notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notif - atualizar"         ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Notif - inserir sistema"   ON notificacoes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: criar perfil automático ao cadastrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_imoveis_updated_at
  BEFORE UPDATE ON imoveis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitas_updated_at
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STORAGE BUCKET para fotos de imóveis
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('imoveis', 'imoveis', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Fotos storage - ver público"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'imoveis');

CREATE POLICY "Fotos storage - upload autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'imoveis' AND auth.role() = 'authenticated');

CREATE POLICY "Fotos storage - deletar dono"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'imoveis' AND auth.uid() = owner);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_user_id     ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_etapa_funil ON clientes(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_imoveis_user_id      ON imoveis(user_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_status       ON imoveis(status);
CREATE INDEX IF NOT EXISTS idx_visitas_user_id      ON visitas(user_id);
CREATE INDEX IF NOT EXISTS idx_visitas_data_hora    ON visitas(data_hora);
CREATE INDEX IF NOT EXISTS idx_matching_score       ON matching(score DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_lida      ON notificacoes(user_id, lida);
