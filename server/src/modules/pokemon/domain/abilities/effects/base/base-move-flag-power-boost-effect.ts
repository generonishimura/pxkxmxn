import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 特定の技フラグを持つ技の威力を上げる基底クラス
 * てつのこぶし（Iron Fist）、がんじょうあご（Strong Jaw）などで使用
 *
 * 補正は4096分率で、ダメージ計算式に入る前の威力（ヒットごと）に掛ける
 */
export abstract class BaseMoveFlagPowerBoostEffect implements IAbilityEffect {
  /**
   * 威力を上げる技のフラグ
   */
  protected abstract readonly boostedFlag: MoveFlag;

  /**
   * 威力の補正（4096分率。例: 1.2倍 = 4915）
   */
  protected abstract readonly powerModifier: number;

  /**
   * 技フラグに boostedFlag があれば、威力を powerModifier / 4096 倍にする
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has(this.boostedFlag) !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, this.powerModifier);
  }
}
