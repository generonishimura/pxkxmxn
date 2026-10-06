import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';

/**
 * 特定の技フラグを持つ技を無効にする基底クラス
 * ぼうおん（Soundproof）、ぼうだん（Bulletproof）、ぼうじん（Overcoat）などで使用
 *
 * isImmuneToMove はエンジンが相手を対象にする技だけで、命中判定の前に呼ぶ（変化技も含む）。
 * かたやぶりで無視される。
 */
export abstract class BaseMoveFlagImmunityEffect implements IAbilityEffect {
  /**
   * 無効にする技のフラグ
   */
  protected abstract readonly immuneFlag: MoveFlag;

  /**
   * 技フラグ（えんかくなどの補正後）に immuneFlag があれば技を無効にする
   */
  isImmuneToMove(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    return battleContext?.moveFlags?.has(this.immuneFlag) === true;
  }
}
