-- AlterTable
ALTER TABLE "battles" ADD COLUMN     "side_state" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "battle_pokemon_status" ADD COLUMN     "persistent_state" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "volatile_state" JSONB NOT NULL DEFAULT '{}';

