import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * イリュージョンで化ける先（本家の onBeforeSwitchIn）
 * 同じトレーナーの手持ちを後ろ（ID の大きい方）から見て、自分以外の、ひんしでない最初のポケモン。
 * そのようなポケモンがいなければ化けない（undefined）
 * 手持ちの順は、エンジンの控えの順と同じく ID の順として扱う
 * 注: 本家は場に出たポケモンを手持ちの先頭に入れ替えてから、それより後ろを探す（候補は自分以外の全員）。
 * エンジンは手持ちの入れ替えを持たないので、入れ替えで変わる順は再現しない
 */
export const findIllusionTarget = (
  statuses: readonly BattlePokemonStatus[],
  holder: BattlePokemonStatus,
): BattlePokemonStatus | undefined =>
  statuses
    .filter(status => status.trainerId === holder.trainerId && status.id !== holder.id)
    .sort((a, b) => b.id - a.id)
    .find(status => status.currentHp > 0);
