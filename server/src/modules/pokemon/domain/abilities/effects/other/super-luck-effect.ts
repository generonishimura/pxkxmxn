import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * きょううん（Super Luck）特性の効果
 * 自分の攻撃技の急所ランクを1段階上げる（本家の onModifyCritRatio: critRatio + 1）
 *
 * - 急所に当たりやすい技・きあいだめと重なる。上限の 3（必ず急所）はエンジンが収める
 */
export class SuperLuckEffect implements IAbilityEffect {
  modifyCritRatio(
    _holder: BattlePokemonStatus,
    stage: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    return stage + 1;
  }
}
