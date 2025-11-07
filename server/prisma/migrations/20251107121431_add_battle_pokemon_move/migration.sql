-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Genderless');

-- CreateEnum
CREATE TYPE "Nature" AS ENUM ('Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('None', 'Sun', 'Rain', 'Sandstorm', 'Hail');

-- CreateEnum
CREATE TYPE "Field" AS ENUM ('None', 'ElectricTerrain', 'GrassyTerrain', 'PsychicTerrain', 'MistyTerrain');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('Active', 'Completed', 'Abandoned');

-- CreateEnum
CREATE TYPE "StatusCondition" AS ENUM ('None', 'Burn', 'Freeze', 'Paralysis', 'Poison', 'BadPoison', 'Sleep');

-- CreateTable
CREATE TABLE "trainers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trained_pokemon" (
    "id" SERIAL NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "pokemon_id" INTEGER NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 50,
    "gender" "Gender",
    "nature" "Nature",
    "ability_id" INTEGER,
    "iv_hp" INTEGER NOT NULL DEFAULT 31,
    "iv_attack" INTEGER NOT NULL DEFAULT 31,
    "iv_defense" INTEGER NOT NULL DEFAULT 31,
    "iv_special_attack" INTEGER NOT NULL DEFAULT 31,
    "iv_special_defense" INTEGER NOT NULL DEFAULT 31,
    "iv_speed" INTEGER NOT NULL DEFAULT 31,
    "ev_hp" INTEGER NOT NULL DEFAULT 0,
    "ev_attack" INTEGER NOT NULL DEFAULT 0,
    "ev_defense" INTEGER NOT NULL DEFAULT 0,
    "ev_special_attack" INTEGER NOT NULL DEFAULT 0,
    "ev_special_defense" INTEGER NOT NULL DEFAULT 0,
    "ev_speed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trained_pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "trained_pokemon_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" SERIAL NOT NULL,
    "trainer1_id" INTEGER NOT NULL,
    "trainer2_id" INTEGER NOT NULL,
    "team1_id" INTEGER NOT NULL,
    "team2_id" INTEGER NOT NULL,
    "turn" INTEGER NOT NULL DEFAULT 1,
    "weather" "Weather",
    "field" "Field",
    "status" "BattleStatus" NOT NULL DEFAULT 'Active',
    "winner_trainer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_pokemon_status" (
    "id" SERIAL NOT NULL,
    "battle_id" INTEGER NOT NULL,
    "trained_pokemon_id" INTEGER NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "current_hp" INTEGER NOT NULL,
    "max_hp" INTEGER NOT NULL,
    "attack_rank" INTEGER NOT NULL DEFAULT 0,
    "defense_rank" INTEGER NOT NULL DEFAULT 0,
    "special_attack_rank" INTEGER NOT NULL DEFAULT 0,
    "special_defense_rank" INTEGER NOT NULL DEFAULT 0,
    "speed_rank" INTEGER NOT NULL DEFAULT 0,
    "accuracy_rank" INTEGER NOT NULL DEFAULT 0,
    "evasion_rank" INTEGER NOT NULL DEFAULT 0,
    "status_condition" "StatusCondition",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battle_pokemon_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_pokemon_moves" (
    "id" SERIAL NOT NULL,
    "battle_pokemon_status_id" INTEGER NOT NULL,
    "move_id" INTEGER NOT NULL,
    "current_pp" INTEGER NOT NULL,
    "max_pp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battle_pokemon_moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainers_name_key" ON "trainers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_email_key" ON "trainers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_position_key" ON "team_members"("team_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "battle_pokemon_status_battle_id_trained_pokemon_id_key" ON "battle_pokemon_status"("battle_id", "trained_pokemon_id");

-- CreateIndex
CREATE UNIQUE INDEX "battle_pokemon_moves_battle_pokemon_status_id_move_id_key" ON "battle_pokemon_moves"("battle_pokemon_status_id", "move_id");

-- AddForeignKey
ALTER TABLE "trained_pokemon" ADD CONSTRAINT "trained_pokemon_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trained_pokemon" ADD CONSTRAINT "trained_pokemon_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "pokemons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trained_pokemon" ADD CONSTRAINT "trained_pokemon_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "abilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_trained_pokemon_id_fkey" FOREIGN KEY ("trained_pokemon_id") REFERENCES "trained_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_trainer1_id_fkey" FOREIGN KEY ("trainer1_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_trainer2_id_fkey" FOREIGN KEY ("trainer2_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_trainer_id_fkey" FOREIGN KEY ("winner_trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pokemon_status" ADD CONSTRAINT "battle_pokemon_status_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pokemon_status" ADD CONSTRAINT "battle_pokemon_status_trained_pokemon_id_fkey" FOREIGN KEY ("trained_pokemon_id") REFERENCES "trained_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pokemon_status" ADD CONSTRAINT "battle_pokemon_status_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pokemon_moves" ADD CONSTRAINT "battle_pokemon_moves_battle_pokemon_status_id_fkey" FOREIGN KEY ("battle_pokemon_status_id") REFERENCES "battle_pokemon_status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_pokemon_moves" ADD CONSTRAINT "battle_pokemon_moves_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "moves"("id") ON DELETE CASCADE ON UPDATE CASCADE;
