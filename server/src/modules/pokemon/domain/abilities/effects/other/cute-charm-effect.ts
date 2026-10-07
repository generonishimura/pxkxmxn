import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';

/**
 * メロメロボディ（Cute Charm）特性の効果
 * 接触技でダメージを受けたとき、30% の確率で相手をメロメロにする
 *
 * - ヒットごとに判定する（本家の onDamagingHit と同じ。連続技ではヒットのたびに判定）
 * - 確率は追加効果ではないので、てんのめぐみ・りんぷんの影響を受けない（本家と同じ）
 * - 性別が違わない相手（どちらかが性別不明を含む）・すでにメロメロの相手・どんかんなどの相手には効かない
 *   （tryApplyVolatile が判定する）
 * - メロメロで 50% 動けないのはエンジンが行う
 */
export class CuteCharmEffect implements IAbilityEffect {
  private static readonly CHANCE = 0.3;
  private static readonly ABILITY_NAME = 'メロメロボディ';

  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.isContact || Math.random() >= CuteCharmEffect.CHANCE) {
      return null;
    }
    const applied = await tryApplyVolatile(
      attacker,
      'attract',
      { infatuatedWithStatusId: holder.id },
      battleContext,
      {
        source: {
          pokemon: holder,
          abilityName: CuteCharmEffect.ABILITY_NAME,
          kind: 'ability',
          name: CuteCharmEffect.ABILITY_NAME,
        },
      },
    );
    return applied ? `${CuteCharmEffect.ABILITY_NAME} activated! fell in love!` : null;
  }
}
