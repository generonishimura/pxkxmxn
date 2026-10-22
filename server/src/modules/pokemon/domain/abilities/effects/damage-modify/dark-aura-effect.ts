import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * ダークオーラ（Dark Aura）特性の効果
 * 場にいる間、自分と相手が使うあくタイプの技の威力を約1.33倍（5448/4096）にする
 * 場にオーラブレイクのポケモンがいると、逆に0.75倍（3072/4096）にする
 * オーラブレイクは攻撃側・防御側の特性名で判定する
 */
export class DarkAuraEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で約1.33倍）
   */
  private static readonly AURA_MODIFIER = 5448;

  /**
   * オーラブレイクがいるときの補正（4096分率で0.75倍）
   */
  private static readonly AURA_BREAK_MODIFIER = 3072;

  modifyAnyBasePower(
    _holder: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveTypeName !== 'あく' || battleContext.moveCategory === 'Status') {
      return undefined;
    }
    const auraBroken = [
      battleContext.attackerAbilityName,
      battleContext.defenderAbilityName,
    ].includes('オーラブレイク');
    return modifyByFixedPoint(
      power,
      auraBroken ? DarkAuraEffect.AURA_BREAK_MODIFIER : DarkAuraEffect.AURA_MODIFIER,
    );
  }
}
