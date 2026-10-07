import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * パワーシフト（Power Shift）技の効果
 * 自分の攻撃と防御の実数値（ランク補正の前の値）を入れ替える（statOverrides）
 *
 * - ランクは入れ替えない（それぞれの能力に残る）
 * - ctx.attackerStats は上書きを反映した値なので、もう一度使うと元の実数値に戻る（本家の onRestart と同じ）
 * - パワートリックと重ねると、同じ攻撃と防御をもう一度入れ替える（本家と同じ）
 * - 交代で元に戻るのはエンジンが行う（volatileState が消える）
 *
 * 注: 本家はバトンタッチで入れ替えた状態を引き継ぐが、ここでは statOverrides が
 *     バトンタッチで引き継ぐキーに入っていないので引き継がない
 */
export class PowerShiftEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const stats = battleContext.attackerStats;
    if (!battleContext.battleRepository || !stats) {
      return 'But it failed';
    }

    await battleContext.battleRepository.patchVolatileState(attacker.id, {
      statOverrides: {
        ...attacker.volatileState.statOverrides,
        attack: stats.defense,
        defense: stats.attack,
      },
    });
    return 'switched its Attack and Defense!';
  }
}
