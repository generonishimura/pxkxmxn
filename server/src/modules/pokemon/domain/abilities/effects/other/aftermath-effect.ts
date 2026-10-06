import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * ゆうばく（Aftermath）特性の効果
 * 接触技でひんしになったとき、攻撃側に最大HPの1/4のダメージを与える
 * 注: 接触技の判定は物理技で近似している（せいでんき・ほのおのからだと同じ）。
 * しめりけとの相互作用や、反動で攻撃側がひんしになったときの処理は扱わない。
 */
export class AftermathEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 4;

  /**
   * 特性を持つポケモンがひんしになったときだけ発動する
   */
  protected shouldActivate(defender: BattlePokemonStatus): boolean {
    return defender.currentHp === 0;
  }
}
