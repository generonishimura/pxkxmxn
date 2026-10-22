import { BaseMoveFlagImmunityEffect } from '../base/base-move-flag-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';

/**
 * ぼうじん（Overcoat）特性の効果
 * 相手の粉の技（キノコのほうし・ねむりごな・しびれごな など）を無効にする。
 * かたやぶりで無視される。
 * 接触した相手のほうし（Effect Spore）による状態異常も受けない（本家の粉への免疫と同じ）。
 * 注: すなあらし・あられのダメージを受けない効果は、ターン終了時の天候ダメージがないため実装していない。
 */
export class OvercoatEffect extends BaseMoveFlagImmunityEffect {
  protected readonly immuneFlag = 'powder';

  /**
   * 粉で状態異常にする特性の名前（ほうし）
   */
  private static readonly POWDER_ABILITY_NAME = 'ほうし';

  /**
   * ほうし（特性）による状態異常を受けない
   * @returns 受けない場合はfalse、判定しない場合はundefined
   */
  canReceiveStatusCondition(
    _pokemon: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _battleContext?: BattleContext,
    source?: EffectSource,
  ): boolean | undefined {
    if (source?.kind === 'ability' && source.name === OvercoatEffect.POWDER_ABILITY_NAME) {
      return false;
    }
    return undefined;
  }
}
