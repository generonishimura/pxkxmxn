-- CreateEnum
CREATE TYPE "AbilityTrigger" AS ENUM ('OnEntry', 'OnTakingDamage', 'OnDealingDamage', 'OnTurnEnd', 'OnSwitchOut', 'Passive', 'OnStatusCondition', 'Other');

-- CreateEnum
CREATE TYPE "AbilityCategory" AS ENUM ('StatChange', 'Immunity', 'Weather', 'DamageModify', 'StatusCondition', 'Other');

-- CreateEnum
CREATE TYPE "MoveCategory" AS ENUM ('Physical', 'Special', 'Status');

-- CreateTable
CREATE TABLE "types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemons" (
    "id" SERIAL NOT NULL,
    "national_dex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "primary_type_id" INTEGER NOT NULL,
    "secondary_type_id" INTEGER,
    "base_hp" INTEGER NOT NULL,
    "base_attack" INTEGER NOT NULL,
    "base_defense" INTEGER NOT NULL,
    "base_special_attack" INTEGER NOT NULL,
    "base_special_defense" INTEGER NOT NULL,
    "base_speed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pokemons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abilities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trigger_event" "AbilityTrigger" NOT NULL,
    "effect_category" "AbilityCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "category" "MoveCategory" NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "pp" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_effectiveness" (
    "id" SERIAL NOT NULL,
    "type_from_id" INTEGER NOT NULL,
    "type_to_id" INTEGER NOT NULL,
    "effectiveness" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "type_effectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_abilities" (
    "id" SERIAL NOT NULL,
    "pokemon_id" INTEGER NOT NULL,
    "ability_id" INTEGER NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pokemon_abilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_moves" (
    "id" SERIAL NOT NULL,
    "pokemon_id" INTEGER NOT NULL,
    "move_id" INTEGER NOT NULL,
    "level" INTEGER,
    "method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pokemon_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "types_name_key" ON "types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "types_name_en_key" ON "types"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "pokemons_national_dex_key" ON "pokemons"("national_dex");

-- CreateIndex
CREATE UNIQUE INDEX "pokemons_name_key" ON "pokemons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pokemons_name_en_key" ON "pokemons"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "abilities_name_key" ON "abilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "abilities_name_en_key" ON "abilities"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "moves_name_key" ON "moves"("name");

-- CreateIndex
CREATE UNIQUE INDEX "moves_name_en_key" ON "moves"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "type_effectiveness_type_from_id_type_to_id_key" ON "type_effectiveness"("type_from_id", "type_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_abilities_pokemon_id_ability_id_key" ON "pokemon_abilities"("pokemon_id", "ability_id");

-- AddForeignKey
ALTER TABLE "pokemons" ADD CONSTRAINT "pokemons_primary_type_id_fkey" FOREIGN KEY ("primary_type_id") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemons" ADD CONSTRAINT "pokemons_secondary_type_id_fkey" FOREIGN KEY ("secondary_type_id") REFERENCES "types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_effectiveness" ADD CONSTRAINT "type_effectiveness_type_from_id_fkey" FOREIGN KEY ("type_from_id") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_effectiveness" ADD CONSTRAINT "type_effectiveness_type_to_id_fkey" FOREIGN KEY ("type_to_id") REFERENCES "types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_abilities" ADD CONSTRAINT "pokemon_abilities_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "pokemons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_abilities" ADD CONSTRAINT "pokemon_abilities_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "abilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_moves" ADD CONSTRAINT "pokemon_moves_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "pokemons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_moves" ADD CONSTRAINT "pokemon_moves_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "moves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
