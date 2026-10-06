import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { AURA_BREAK_ABILITY_NAME } from './aura-break-effect';

/**
 * フェアリーオーラ（Fairy Aura）特性の効果
 * 場にいる間、自分と相手のフェアリー技の威力が 5448/4096（約 1.33）倍になる
 * 場にオーラブレイクのポケモンがいるときは、逆に 3072/4096（0.75）倍になる
 *
 * 場の特性の modifyAnyBasePower で威力に掛ける（かたやぶりでは無視されない。本家と同じ）
 */
export class FairyAuraEffect implements IAbilityEffect {
  private static readonly BOOSTED_TYPE = 'フェアリー';
  private static readonly AURA_MULTIPLIER = 5448;
  private static readonly AURA_BREAK_MULTIPLIER = 3072;

  modifyAnyBasePower(
    _holder: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveTypeName !== FairyAuraEffect.BOOSTED_TYPE) {
      return undefined;
    }
    const auraBroken = [
      battleContext.attackerAbilityName,
      battleContext.defenderAbilityName,
    ].includes(AURA_BREAK_ABILITY_NAME);
    return modifyByFixedPoint(
      power,
      auraBroken ? FairyAuraEffect.AURA_BREAK_MULTIPLIER : FairyAuraEffect.AURA_MULTIPLIER,
    );
  }
}
