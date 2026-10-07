import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * イリュージョンで化ける先（本家の onBeforeSwitchIn）
 * 同じトレーナーの手持ちを後ろ（ID の大きい方）から見て、自分より後ろにいる、ひんしでない最初のポケモン。
 * 自分が手持ちの最後なら化けない（undefined）
 * 手持ちの順は、エンジンの控えの順と同じく ID の順として扱う
 */
export const findIllusionTarget = (
  statuses: readonly BattlePokemonStatus[],
  holder: BattlePokemonStatus,
): BattlePokemonStatus | undefined =>
  statuses
    .filter(status => status.trainerId === holder.trainerId && status.id > holder.id)
    .sort((a, b) => b.id - a.id)
    .find(status => status.currentHp > 0);
