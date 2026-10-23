-- チャンピオンズにない補正なしの性格（がんばりや・すなお・てれや・きまぐれ）を、
-- 同じく補正なしの まじめ に置き換える。能力値は変わらない。
-- 置き換えないと、読み込み時に TrainedPokemon のバリデーションで弾かれる。
UPDATE "trained_pokemon"
SET "nature" = 'Serious'
WHERE "nature" IN ('Hardy', 'Docile', 'Bashful', 'Quirky');
