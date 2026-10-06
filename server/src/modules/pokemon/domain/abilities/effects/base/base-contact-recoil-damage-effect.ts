import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyIndirectDamage } from '../../../battle-events/indirect-damage';

/**
 * 接触技を受けたときに攻撃側へダメージを与える基底クラス
 * さめはだ（Rough Skin）、てつのトゲ（Iron Barbs）、ゆうばく（Aftermath）で使用
 *
 * 攻撃側の最大HPの 1/damageDivisor（切り捨て、最低1）のダメージを与える。
 * ダメージは applyIndirectDamage で与えるため、攻撃側がマジックガードなら減らない。
 * 防御側の onDamagingHit フックで、接触したヒットごとに与える（連続技ではヒットのたびに与える。本家と同じ）。
 * 接触したかは hit.isContact（技フラグの contact。えんかくなどで接触しなくなった技は false）で判定する。
 * 攻撃側がひんしになると、エンジンが残りのヒットを止める。
 */
export abstract class BaseContactRecoilDamageEffect implements IAbilityEffect {
  /**
   * 攻撃側の最大HPを割る数（例: 8 なら最大HPの1/8）
   */
  protected abstract readonly damageDivisor: number;

  /**
   * 特性名（メッセージ「<特性名> activated!」に使う）
   */
  protected abstract readonly abilityName: string;

  /**
   * 発動条件（既定では常に発動）
   * @param _holder ダメージを受けた後の防御側のポケモン
   * @param _battleContext バトルコンテキスト
   */
  protected shouldActivate(_holder: BattlePokemonStatus, _battleContext: BattleContext): boolean {
    return true;
  }

  /**
   * 接触したヒットのたびに、攻撃側へダメージを与える
   *
   * @param holder 防御側のポケモン（特性を持つ側。ダメージ反映後の状態）
   * @param attacker 攻撃側のポケモン（ダメージを受ける側）
   * @param hit このヒットの情報
   * @param battleContext バトルコンテキスト
   * @returns ダメージを与えた場合は「<特性名> activated!」、与えなかった場合は null
   */
  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository || !hit.isContact) {
      return null;
    }

    if (!this.shouldActivate(holder, battleContext)) {
      return null;
    }

    // 攻撃側が既にひんしの場合は処理しない
    if (attacker.currentHp <= 0) {
      return null;
    }

    // 技以外のダメージなので、攻撃側のマジックガードで防がれる
    const damage = Math.max(1, Math.floor(attacker.maxHp / this.damageDivisor));
    const dealt = await applyIndirectDamage(attacker, damage, battleContext);

    return dealt > 0 ? `${this.abilityName} activated!` : null;
  }
}
