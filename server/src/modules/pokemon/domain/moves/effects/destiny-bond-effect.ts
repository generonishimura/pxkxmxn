import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * みちづれ（Destiny Bond）技の効果
 * 自分をみちづれ状態にする（destinyBond）。次に自分が技を出そうとするまでに相手の技でひんしになると、相手もひんしになる
 *
 * - 前の行動でもみちづれを成功させていたら失敗する（第 7 世代以降。consecutiveMoveCount で判定する）
 * - 相手をひんしにするのと、次に技を出そうとしたとき（出せなかったときも）に消すのはエンジンが行う
 * - みらいよちなどで倒されたときは発動しない（エンジンが判定する）
 */
export class DestinyBondEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return (attacker.volatileState.consecutiveMoveCount ?? 0) > 0;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      attacker,
      'destinyBond',
      { destinyBond: true },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'is trying to take its foe down with it!' : 'But it failed';
  }
}
