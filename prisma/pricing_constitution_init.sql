CREATE TABLE IF NOT EXISTS "PricingConstitution" (
  "id"              TEXT             NOT NULL,
  "name"            TEXT             NOT NULL,
  "notes"           TEXT             NOT NULL DEFAULT '',
  "type"            TEXT             NOT NULL,
  "provider"        TEXT             NOT NULL,
  "billing"         TEXT             NOT NULL,
  "kieCredits"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "waveUsd"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "userCreditsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxDuration"     INTEGER,
  "isActive"        BOOLEAN          NOT NULL DEFAULT TRUE,
  "updatedAt"       TIMESTAMP(3)     NOT NULL DEFAULT NOW(),
  CONSTRAINT "PricingConstitution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PricingConstitution_type_idx"     ON "PricingConstitution"("type");
CREATE INDEX IF NOT EXISTS "PricingConstitution_isActive_idx" ON "PricingConstitution"("isActive");

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "key"       TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

CREATE OR REPLACE FUNCTION update_pricing_constitution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_constitution_updated_at ON "PricingConstitution";
CREATE TRIGGER pricing_constitution_updated_at
  BEFORE UPDATE ON "PricingConstitution"
  FOR EACH ROW EXECUTE PROCEDURE update_pricing_constitution_updated_at();

CREATE OR REPLACE FUNCTION update_platform_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_config_updated_at ON "PlatformConfig";
CREATE TRIGGER platform_config_updated_at
  BEFORE UPDATE ON "PlatformConfig"
  FOR EACH ROW EXECUTE PROCEDURE update_platform_config_updated_at();

INSERT INTO "PricingConstitution"
  ("id", "name", "notes", "type", "provider", "billing", "kieCredits", "waveUsd", "userCreditsRate", "maxDuration", "isActive")
VALUES
  
  ('kling30', 'Kling 3.0', 'std', 'video', 'kie', 'per_sec', 14, 0, 3.5, 15, TRUE),
  ('kling30_mc', 'Kling 3.0 Motion Control', 'motion', 'video', 'kie', 'per_sec', 16.4, 0, 2.8, 15, TRUE),
  ('kling25t', 'Kling 2.5 Turbo', 'fast', 'video', 'kie', 'per_sec', 8.4, 0, 1.43, 10, TRUE),
  ('hailuo23f', 'Hailuo 2.3 Fast', 'fast', 'video', 'kie', 'per_sec', 6, 0, 1.03, 10, TRUE),
  ('hailuo23', 'Hailuo 2.3', 'pro', 'video', 'kie', 'per_sec', 10, 0, 1.71, 10, TRUE),
  ('grok_vid', 'Grok Imagine Video', 'T2V/I2V', 'video', 'kie', 'per_sec', 9, 0, 1.54, 20, TRUE),
  ('seedance2f', 'Seedance 2.0 Fast', 'fast', 'video', 'kie', 'per_sec', 33, 0, 6.7, 15, TRUE),
  ('seedance2', 'Seedance 2.0', 'HQ', 'video', 'kie', 'per_sec', 41, 0, 8, 15, TRUE),
  ('sora2', 'Sora 2', '10s max', 'cinema', 'kie', 'per_sec', 20, 0, 3.41, 10, TRUE),
  ('sora2_i2v', 'Sora 2 I2V', 'img2vid', 'cinema', 'kie', 'per_sec', 22, 0, 3.75, 10, TRUE),
  ('sora2_pro', 'Sora 2 Pro', '15s max', 'cinema', 'kie', 'per_sec', 30, 0, 5.12, 15, TRUE),
  ('veo31_lite', 'Google Veo 3.1 Lite', 'fast', 'cinema', 'kie', 'per_sec', 10, 0, 1.71, 8, TRUE),
  ('veo31_fast', 'Google Veo 3.1 Fast', '8s', 'cinema', 'kie', 'per_sec', 10, 0, 1.71, 8, TRUE),
  ('veo31', 'Google Veo 3.1', 'HQ 8s', 'cinema', 'kie', 'per_sec', 31.25, 0, 5.32, 8, TRUE),
  ('nano_pro', 'Nano Banana Pro', '4K I2I', 'image', 'kie', 'flat', 18, 0, 3.07, NULL, TRUE),
  ('nano2', 'Nano Banana 2', 'T2I', 'image', 'kie', 'flat', 3.5, 0, 0.6, NULL, TRUE),
  ('nano', 'Nano Banana', 'std', 'image', 'kie', 'flat', 2, 0, 0.35, NULL, TRUE),
  ('nano_edit', 'Nano Banana Edit', 'edit', 'image', 'kie', 'flat', 4, 0, 0.69, NULL, TRUE),
  ('imagen4f', 'Google Imagen 4 Fast', 'T2I', 'image', 'kie', 'flat', 1.6, 0, 0.3, NULL, TRUE),
  ('imagen4', 'Google Imagen 4', 'HQ', 'image', 'kie', 'flat', 6, 0, 1.03, NULL, TRUE),
  ('imagen4u', 'Google Imagen 4 Ultra', 'Ultra', 'image', 'kie', 'flat', 12, 0, 2.05, NULL, TRUE),
  ('seedream45', 'Seedream 4.5 T2I', 'T2I', 'image', 'kie', 'flat', 3.5, 0, 0.6, NULL, TRUE),
  ('seedream45e', 'Seedream 4.5 Edit', 'edit', 'image', 'kie', 'flat', 4, 0, 0.69, NULL, TRUE),
  ('seedream5l', 'Seedream 5 Lite T2I', 'T2I', 'image', 'wavespeed', 'flat', 0, 0.012, 0.45, NULL, TRUE),
  ('seedream5i', 'Seedream 5 Lite I2I', 'I2I', 'image', 'wavespeed', 'flat', 0, 0.015, 0.57, NULL, TRUE),
  ('zimage', 'Z-Image', 'T2I', 'image', 'kie', 'flat', 3, 0, 0.52, NULL, TRUE),
  ('grok_img', 'Grok Imagine', 'T2I', 'image', 'kie', 'flat', 4, 0, 0.69, NULL, TRUE),
  ('grok_imge', 'Grok Imagine Edit', 'edit', 'image', 'kie', 'flat', 5, 0, 0.86, NULL, TRUE),
  ('gpt2t', 'GPT Image 2 T2I', '1K/2K/4K', 'image', 'kie', 'flat', 6, 0, 1.03, NULL, TRUE),
  ('gpt2i', 'GPT Image 2 I2I', '1K/2K/4K', 'image', 'kie', 'flat', 7, 0, 1.2, NULL, TRUE),
  ('gpt15t', 'GPT Image 1.5 T2I', 'T2I', 'image', 'kie', 'flat', 4, 0, 0.69, NULL, TRUE),
  ('gpt15i', 'GPT Image 1.5 I2I', 'I2I', 'image', 'kie', 'flat', 5, 0, 0.86, NULL, TRUE),
  ('qwen_t', 'Qwen Image T2I', 'T2I', 'image', 'kie', 'flat', 3, 0, 0.52, NULL, TRUE),
  ('qwen_i', 'Qwen Image I2I', 'I2I', 'image', 'kie', 'flat', 3.5, 0, 0.6, NULL, TRUE),
  ('flux2_pro_t', 'FLUX.2 Pro T2I', 'hidden', 'image', 'kie', 'flat', 3, 0, 0.52, NULL, TRUE),
  ('flux2_pro_i', 'FLUX.2 Pro I2I', 'hidden', 'image', 'kie', 'flat', 3, 0, 0.52, NULL, TRUE),
  ('flux2_flex_t', 'FLUX.2 Flex T2I', 'hidden', 'image', 'kie', 'flat', 2, 0, 0.35, NULL, TRUE),
  ('flux2_flex_i', 'FLUX.2 Flex I2I', 'hidden', 'image', 'kie', 'flat', 2, 0, 0.35, NULL, TRUE),
  ('el_v2', 'ElevenLabs V2', '29 langs', 'audio', 'kie', 'flat', 16, 0, 2.73, NULL, TRUE),
  ('el_v3', 'ElevenLabs V3', '70+ langs', 'audio', 'kie', 'flat', 20, 0, 3.41, NULL, TRUE),
  ('voice_gen', 'Voice Generator', 'TTS', 'audio', 'kie', 'flat', 12, 0, 2.05, NULL, TRUE),
  ('voice_clone', 'Voice Cloning', 'clone', 'audio', 'kie', 'flat', 20, 0, 3.41, NULL, TRUE),
  ('voice_chg', 'Voice Changer', 'S2S', 'audio', 'kie', 'flat', 14, 0, 2.39, NULL, TRUE),
  ('dubbing', 'Dubbing', 'multi-lang', 'audio', 'kie', 'flat', 24, 0, 4.09, NULL, TRUE),
  ('sfx', 'Sound Effect', 'SFX', 'audio', 'kie', 'flat', 8, 0, 1.37, NULL, TRUE),
  ('music_gen', 'Music Generator', 'full song', 'audio', 'kie', 'flat', 20, 0, 3.41, NULL, TRUE),
  ('lipsync', 'Lip Sync', 'audio-driven', 'audio', 'kie', 'flat', 30, 0, 5.12, NULL, TRUE),
  ('tripo25', 'Tripo3D 2.5', '$0.10/run', '3d', 'wavespeed', 'flat', 0, 0.1, 3.9, NULL, TRUE),
  ('hunya31', 'Hunyuan3D 3.1', '$0.023/run', '3d', 'wavespeed', 'flat', 0, 0.023, 1, NULL, TRUE),
  ('hunya3', 'Hunyuan3D 3', '$0.375/run', '3d', 'wavespeed', 'flat', 0, 0.375, 11.3, NULL, FALSE),
  ('meshy6', 'Meshy 6', '$0.20/run', '3d', 'wavespeed', 'flat', 0, 0.2, 7.8, NULL, TRUE),
  ('tool_upscale', 'Video/Image Upscale', '4K/8K', 'image', 'wavespeed', 'flat', 0, 0.03, 1.2, NULL, TRUE),
  ('tool_rmbg', 'Remove Background', 'RMBG-2.0', 'image', 'wavespeed', 'flat', 0, 0.01, 0.4, NULL, TRUE),
  ('tool_faceswap', 'Face Swap', 'pro', 'image', 'wavespeed', 'flat', 0, 0.02, 0.8, NULL, TRUE),
  ('tool_instant_character', 'Instant Character', '$0.10/run', 'image', 'wavespeed', 'flat', 0, 0.1, 3.9, NULL, TRUE),
  ('dalle3', 'DALL-E 3', 'legacy', 'image', 'kie', 'flat', 5, 0, 0.86, NULL, TRUE)
ON CONFLICT ("id") DO UPDATE SET
  "name"            = EXCLUDED."name",
  "notes"           = EXCLUDED."notes",
  "type"            = EXCLUDED."type",
  "provider"        = EXCLUDED."provider",
  "billing"         = EXCLUDED."billing",
  "kieCredits"      = EXCLUDED."kieCredits",
  "waveUsd"         = EXCLUDED."waveUsd",
  "userCreditsRate" = EXCLUDED."userCreditsRate",
  "maxDuration"     = EXCLUDED."maxDuration",
  "isActive"        = EXCLUDED."isActive",
  "updatedAt"       = NOW();

INSERT INTO "PlatformConfig" ("key", "value")
VALUES ('kie_pkg_index', '1')
ON CONFLICT ("key") DO NOTHING;
