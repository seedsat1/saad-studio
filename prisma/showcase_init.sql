-- Showcase System
-- Run against the production database before using /explore showcase feeds.

CREATE TABLE IF NOT EXISTS "showcase_items" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "model" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "video_url" TEXT NOT NULL,
  "thumbnail_url" TEXT NOT NULL,
  "prompt" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "views" INTEGER NOT NULL DEFAULT 0,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "showcase_items_featured_created_at_idx"
  ON "showcase_items" ("featured", "created_at");

CREATE INDEX IF NOT EXISTS "showcase_items_status_created_at_idx"
  ON "showcase_items" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "showcase_items_views_likes_idx"
  ON "showcase_items" ("views", "likes");

CREATE INDEX IF NOT EXISTS "showcase_items_created_at_idx"
  ON "showcase_items" ("created_at");
