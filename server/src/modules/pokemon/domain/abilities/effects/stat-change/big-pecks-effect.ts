import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * はとむね（Big Pecks）特性の効果
 * 防御ランクが下がらない
 *
 * 注意: この特性は、防御ランクを下げる技や特性効果を無効化する必要がある。
 * 現在の実装では、ステータス変化を適用する前にこの特性をチェックする必要がある。
 * これは、技の特殊効果や特性効果の実装で処理される。
 *
 * この特性は、防御ランクを下げる効果を無効化するため、
 * ステータス変化を適用する際にチェックする必要がある。
 * 現在の実装では、この特性は防御ランクが下がらないことを保証するのみで、
 * 実際の無効化処理は、ステータス変化を適用する側で実装する必要がある。
 */
export class BigPecksEffect implements IAbilityEffect {
  /**
   * 防御ランクが下がることを防ぐ
   * この特性は、防御ランクを下げる効果を無効化する必要があるが、
   * 現在の実装では、ステータス変化を適用する側でチェックする必要がある。
   *
   * 注意: このメソッドは、将来的にステータス変化を適用する際に
   * この特性をチェックするためのフラグとして使用される可能性がある。
   * 現在の実装では、この特性は防御ランクが下がらないことを保証するのみ。
   */
  passiveEffect?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void {
    // この特性は、防御ランクが下がらないことを保証するのみ。
    // 実際の無効化処理は、ステータス変化を適用する側で実装する必要がある。
  }
}
