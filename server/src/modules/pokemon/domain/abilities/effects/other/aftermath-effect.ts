import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ゆうばくのダメージを防ぐ特性
 */
const DAMP_ABILITY_NAME = 'しめりけ';

/**
 * ゆうばく（Aftermath）特性の効果
 * 接触技でひんしになったとき、攻撃側に最大HPの1/4（切り捨て、最低1）のダメージを与える
 *
 * - ひんしになったヒットで1回だけ発動する（連続技の途中でひんしになっても1回。本家と同じ）
 * - 接触技の判定は技フラグの contact で行う
 * - 攻撃側の特性が しめりけ なら、ダメージを与えない（本家と同じ）
 * - ダメージは技以外のダメージなので、攻撃側のマジックガードで防がれる
 */
export class AftermathEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 4;
  protected readonly abilityName = 'ゆうばく';

  /**
   * 特性を持つポケモンがひんしになったときだけ発動する。攻撃側がしめりけなら発動しない
   */
  protected shouldActivate(holder: BattlePokemonStatus, battleContext: BattleContext): boolean {
    return holder.currentHp === 0 && battleContext.attackerAbilityName !== DAMP_ABILITY_NAME;
  }
}
