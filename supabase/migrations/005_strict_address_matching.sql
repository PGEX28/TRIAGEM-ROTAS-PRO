-- =============================================
-- MIGRATION 005: Strict Address Matching Function
-- Corrige o bug onde endereços com o mesmo logradouro mas números
-- de casa diferentes eram mesclados em um único ponto de entrega.
-- O número da casa é um diferenciador ABSOLUTO - nunca deve ser ignorado.
-- =============================================

CREATE OR REPLACE FUNCTION find_matching_address_strict(
  p_org_id UUID,
  p_normalized_key TEXT,
  p_zip_code TEXT DEFAULT NULL,
  p_street_number TEXT DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.85
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_address_id UUID;
BEGIN
  -- 1. Match exato por CEP + chave + número
  IF p_zip_code IS NOT NULL AND p_street_number IS NOT NULL THEN
    SELECT id INTO v_address_id
    FROM addresses
    WHERE organization_id = p_org_id
      AND REPLACE(zip_code, '-', '') = REPLACE(p_zip_code, '-', '')
      AND normalized_key = p_normalized_key
      AND COALESCE(TRIM("number"), '') = TRIM(p_street_number)
    LIMIT 1;
    IF FOUND THEN RETURN v_address_id; END IF;
  END IF;

  -- 2. Match exato por chave + número
  IF p_street_number IS NOT NULL THEN
    SELECT id INTO v_address_id
    FROM addresses
    WHERE organization_id = p_org_id
      AND normalized_key = p_normalized_key
      AND COALESCE(TRIM("number"), '') = TRIM(p_street_number)
    LIMIT 1;
    IF FOUND THEN RETURN v_address_id; END IF;
  END IF;

  -- 3. Fuzzy match por similaridade — SOMENTE SE o número for idêntico.
  -- "Rua X, 319" e "Rua X, 177" NUNCA podem ser o mesmo ponto de entrega.
  IF p_street_number IS NOT NULL AND p_street_number != '' THEN
    SELECT id INTO v_address_id
    FROM addresses
    WHERE organization_id = p_org_id
      AND COALESCE(TRIM("number"), '') = TRIM(p_street_number)
      AND similarity(normalized_key, p_normalized_key) >= p_similarity_threshold
    ORDER BY similarity(normalized_key, p_normalized_key) DESC
    LIMIT 1;
  ELSE
    -- Sem número: fuzzy match com threshold mais alto para compensar ausência de constraint
    SELECT id INTO v_address_id
    FROM addresses
    WHERE organization_id = p_org_id
      AND similarity(normalized_key, p_normalized_key) >= p_similarity_threshold
    ORDER BY similarity(normalized_key, p_normalized_key) DESC
    LIMIT 1;
  END IF;

  RETURN v_address_id;
END;
$$;

-- Também elevar o threshold do find_matching_address original (sem número) para 0.90
-- para reduzir falsos positivos em endereços sem numeração
CREATE OR REPLACE FUNCTION find_matching_address(
  p_org_id UUID,
  p_normalized_key TEXT,
  p_zip_code TEXT DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.90
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_address_id UUID;
BEGIN
  IF p_zip_code IS NOT NULL THEN
    SELECT id INTO v_address_id
    FROM addresses
    WHERE organization_id = p_org_id
      AND REPLACE(zip_code, '-', '') = REPLACE(p_zip_code, '-', '')
      AND normalized_key = p_normalized_key
    LIMIT 1;
    IF FOUND THEN RETURN v_address_id; END IF;
  END IF;
  SELECT id INTO v_address_id
  FROM addresses
  WHERE organization_id = p_org_id
    AND normalized_key = p_normalized_key
  LIMIT 1;
  IF FOUND THEN RETURN v_address_id; END IF;
  SELECT id INTO v_address_id
  FROM addresses
  WHERE organization_id = p_org_id
    AND similarity(normalized_key, p_normalized_key) >= p_similarity_threshold
  ORDER BY similarity(normalized_key, p_normalized_key) DESC
  LIMIT 1;
  RETURN v_address_id;
END;
$$;
