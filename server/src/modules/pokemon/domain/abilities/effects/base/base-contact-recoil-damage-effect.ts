import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * 接触技を受けたときに攻撃側へダメージを与える基底クラス
 * さめはだ（Rough Skin）、ゆうばく（Aftermath）などで使用
 *
 * 攻撃側の最大HPの 1/damageDivisor（切り捨て、最低1）のダメージを与える。
 * MoveExecutorService が接触時に呼び出す applyContactStatusCondition フックを利用する。
 * 注: 接触技の判定は物理技（moveCategory === 'Physical'）で近似している。
 */
export abstract class BaseContactRecoilDamageEffect implements IAbilityEffect {
  /**
   * 攻撃側の最大HPを割る数（例: 8 なら最大HPの1/8）
   */
  protected abstract readonly damageDivisor: number;

  /**
   * ダメージ修正（この特性はダメージを修正しない）
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    return damage;
  }

  /**
   * 発動条件（既定では常に発動）
   * @param _defender ダメージを受けた後の防御側のポケモン
   */
  protected shouldActivate(_defender: BattlePokemonStatus): boolean {
    return true;
  }

  /**
   * 接触技を受けたときに攻撃側へダメージを与える
   * MoveExecutorServiceから呼び出される
   *
   * @param defender 防御側のポケモン（特性を持つ側）
   * @param attacker 攻撃側のポケモン（ダメージを受ける側）
   * @param battleContext バトルコンテキスト
   * @returns ダメージを与えた場合はtrue、与えなかった場合はfalse
   */
  async applyContactStatusCondition(
    defender: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<boolean> {
    if (!battleContext?.battleRepository) {
      return false;
    }

    // 接触技でない場合は処理しない
    if (battleContext.moveCategory !== 'Physical') {
      return false;
    }

    if (!this.shouldActivate(defender)) {
      return false;
    }

    // 攻撃側が既にひんしの場合は処理しない
    if (attacker.currentHp <= 0) {
      return false;
    }

    const damage = Math.max(1, Math.floor(attacker.maxHp / this.damageDivisor));
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: Math.max(0, attacker.currentHp - damage),
    });

    return true;
  }
}
