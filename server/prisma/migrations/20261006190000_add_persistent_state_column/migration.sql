-- AlterTable
ALTER TABLE "battle_pokemon_status" ADD COLUMN     "persistent_state" JSONB NOT NULL DEFAULT '{}'::jsonb;
