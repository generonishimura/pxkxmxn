import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * ふんどのこぶし（Rage Fist）技の効果
 *
 * 威力は 50 + 50 × 攻撃を受けた回数（最大 350）。
 * 回数はエンジンが volatileState.timesAttacked に書く（連続技はヒットごと。みがわりに当たったヒットは数えない）
 *
 * チャンピオンズでは、交代すると上乗せが消える（timesAttacked は volatileState なので交代で消える）。
 * SV は交代しても残る
 */
export class RageFistEffect implements IMoveEffect {
  private static readonly BASE_POWER = 50;
  private static readonly POWER_PER_HIT = 50;
  private static readonly MAX_POWER = 350;

  /**
   * ダメージ計算前に何もしない
   *
   * このメソッドがあると、MoveExecutorService が威力を決める前に使用者の最新の状態を取り直す。
   * このターンに先に動いた相手の攻撃を受けた回数を見るために必要
   */
  beforeDamage(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * 攻撃を受けた回数から威力を決める（本家の basePowerCallback と同じ式）
   */
  modifyMovePower(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): number {
    const times = attacker.volatileState.timesAttacked ?? 0;
    return Math.min(
      RageFistEffect.MAX_POWER,
      RageFistEffect.BASE_POWER + RageFistEffect.POWER_PER_HIT * times,
    );
  }
}
