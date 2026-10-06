import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * パンクロック（Punk Rock）特性の効果
 * 自分の音技の威力を1.3倍（5325/4096）にし、相手の音技で受けるダメージを半分（2048/4096）にする
 *
 * - 音技の判定は技フラグ（sound）で行う
 * - 受けるダメージの半減はかたやぶりで無視される（エンジンが防御側の modifyDamage を呼ばない）
 */
export class PunkRockEffect implements IAbilityEffect {
  /**
   * 音技の威力の補正（4096分率で1.3倍）
   */
  private static readonly POWER_MODIFIER = 5325;

  /**
   * 音技で受けるダメージの補正（4096分率で0.5倍）
   */
  private static readonly DAMAGE_MODIFIER = 2048;

  /**
   * 攻撃側: 音技の威力を1.3倍にする
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has('sound') !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, PunkRockEffect.POWER_MODIFIER);
  }

  /**
   * 防御側: 音技で受けるダメージを半分にする
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (battleContext?.moveFlags?.has('sound') !== true) {
      return damage;
    }
    return modifyByFixedPoint(damage, PunkRockEffect.DAMAGE_MODIFIER);
  }
}
