import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { BaseSelfMultiStatChangeMoveEffect } from './base-self-multi-stat-change-move-effect';
import { resolveAbilityName } from '@/modules/pokemon/domain/battle-events/ability-lookup';

/**
 * 特性が「プラス」または「マイナス」のポケモンの能力ランクを上げる変化技の基底クラス
 *
 * 例: じばそうさ（防御+1, 特防+1）、アシストギア（攻撃+1, 特攻+1）
 *
 * - シングルバトルでは対象は自分だけになる
 * - 自分の特性を trainedPokemonRepository から取得し、プラス・マイナス以外なら失敗（null を返す）
 * - 能力の上げ方は BaseSelfMultiStatChangeMoveEffect と同じ
 */
export abstract class BasePlusMinusSelfStatBoostEffect extends BaseSelfMultiStatChangeMoveEffect {
  private static readonly TARGET_ABILITY_NAMES: ReadonlyArray<string> = ['プラス', 'マイナス'];

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!(await this.hasPlusOrMinus(attacker, battleContext))) {
      return null;
    }
    return super.onUse(attacker, defender, battleContext);
  }

  private async hasPlusOrMinus(
    attacker: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    if (!battleContext.trainedPokemonRepository) {
      return false;
    }
    // 実効の特性（特性の上書き・いえき・かがくへんかガスを反映）
    const abilityName = await resolveAbilityName(attacker, battleContext);
    return (
      abilityName !== undefined &&
      BasePlusMinusSelfStatBoostEffect.TARGET_ABILITY_NAMES.includes(abilityName)
    );
  }
}
