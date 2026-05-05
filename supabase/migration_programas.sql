-- Create programas table
CREATE TABLE IF NOT EXISTS programas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  puntos_por_visita INTEGER NOT NULL DEFAULT 1,
  puntos_para_recompensa INTEGER NOT NULL DEFAULT 10,
  recompensa TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE programas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='programas' AND policyname='Owners manage own programas') THEN
    CREATE POLICY "Owners manage own programas" ON programas
      FOR ALL USING (negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='programas' AND policyname='Public read programas') THEN
    CREATE POLICY "Public read programas" ON programas FOR SELECT USING (true);
  END IF;
END $$;

-- Scope clientes, visitas, cupones to a specific program
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS programa_id UUID REFERENCES programas(id);
ALTER TABLE visitas  ADD COLUMN IF NOT EXISTS programa_id UUID REFERENCES programas(id);
ALTER TABLE cupones  ADD COLUMN IF NOT EXISTS programa_id UUID REFERENCES programas(id);
