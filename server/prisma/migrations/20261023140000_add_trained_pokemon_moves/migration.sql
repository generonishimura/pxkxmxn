-- CreateTable
CREATE TABLE "trained_pokemon_moves" (
    "id" SERIAL NOT NULL,
    "trained_pokemon_id" INTEGER NOT NULL,
    "move_id" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trained_pokemon_moves_pkey" PRIMARY KEY ("id"),
    -- 技の枠は 1〜4（Prisma のスキーマでは書けないので、SQL で足す）
    CONSTRAINT "trained_pokemon_moves_slot_check" CHECK ("slot" BETWEEN 1 AND 4)
);

-- CreateIndex
CREATE UNIQUE INDEX "trained_pokemon_moves_trained_pokemon_id_slot_key" ON "trained_pokemon_moves"("trained_pokemon_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "trained_pokemon_moves_trained_pokemon_id_move_id_key" ON "trained_pokemon_moves"("trained_pokemon_id", "move_id");

-- AddForeignKey
ALTER TABLE "trained_pokemon_moves" ADD CONSTRAINT "trained_pokemon_moves_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "moves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trained_pokemon_moves" ADD CONSTRAINT "trained_pokemon_moves_trained_pokemon_id_fkey" FOREIGN KEY ("trained_pokemon_id") REFERENCES "trained_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
