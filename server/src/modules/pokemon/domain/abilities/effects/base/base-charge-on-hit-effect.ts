import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { HitResult } from '../../../battle-events/hit-result';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';

/**
 * ダメージを受けたとき、じゅうでん状態（volatileState.charged）になる特性の基底クラス
 * （でんきにかえる・ふうりょくでんき）
 *
 * 1 以上のダメージを受けたヒットごとに判定する（onDamagingHit）。みがわりに当たったときは発動しない。
 * 次のでんき技の威力 2 倍と、でんき技を出したときに消すのはエンジンが行う。
 * ひんしになったヒットでは発動しない。すでにじゅうでん状態でも、本家と同じくもう一度じゅうでんする
 * （状態は変わらず、メッセージだけ出る）。本家ではかたやぶりで無視されない
 */
export abstract class BaseChargeOnHitEffect implements IAbilityEffect {
  /**
   * 特性名（付与元として渡す）
   */
  protected abstract readonly abilityName: string;

  /**
   * このヒットでじゅうでん状態になるか
   */
  protected abstract chargesOn(hit: HitResult, battleContext: BattleContext): boolean;

  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext ||
      hit.targetFainted ||
      holder.currentHp <= 0 ||
      !this.chargesOn(hit, battleContext)
    ) {
      return null;
    }
    if (holder.volatileState.charged === true) {
      return 'became charged!';
    }
    const charged = await tryApplyVolatile(holder, 'charge', { charged: true }, battleContext, {
      source: { pokemon: holder, kind: 'ability', name: this.abilityName },
    });
    return charged ? 'became charged!' : null;
  }
}
