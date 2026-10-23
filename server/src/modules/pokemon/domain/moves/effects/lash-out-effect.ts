import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * うっぷんばらし（Lash Out）技の効果
 *
 * このターンに使用者の能力ランクが下がっていたら、威力が 2 倍（75 → 150）になる。
 * 「下がった」は applyStatChanges が書く volatileState.statsLoweredTurn で判定する（本家の statsLoweredThisTurn）
 *
 * 注: ランクを直接書く効果（ハートスワップ・くろいきりなど。docs/battle-engine-hooks.md 7 章）で下がったときは数えない。
 *     本家も boost を通らない変化は数えない
 */
export class LashOutEffect implements IMoveEffect {
  private static readonly POWER_MULTIPLIER = 2;

  /**
   * ダメージ計算前に何もしない
   *
   * このメソッドがあると、MoveExecutorService が威力を決める前に使用者の最新の状態を取り直す。
   * このターンに先に動いた相手の技・特性で下がったことを見るために必要
   */
  beforeDamage(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * このターンに能力ランクが下がっていたら威力を 2 倍にする
   */
  modifyMovePower(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const power = battleContext.movePower;
    if (power == null || attacker.volatileState.statsLoweredTurn !== battleContext.battle.turn) {
      return undefined;
    }
    return power * LashOutEffect.POWER_MULTIPLIER;
  }
}
