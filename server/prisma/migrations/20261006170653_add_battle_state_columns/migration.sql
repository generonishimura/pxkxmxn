-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "side_state" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "battle_pokemon_status" ADD COLUMN     "volatile_state" JSONB NOT NULL DEFAULT '{}'::jsonb;
