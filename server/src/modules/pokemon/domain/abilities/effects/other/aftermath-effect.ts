import { BaseContactRecoilDamageEffect } from '../base/base-contact-recoil-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ゆうばくのダメージを防ぐ特性
 */
const DAMP_ABILITY_NAME = 'しめりけ';

/**
 * ゆうばく（Aftermath）特性の効果
 * 接触技でひんしになったとき、攻撃側に最大HPの1/4のダメージを与える
 * 攻撃側の特性が しめりけ なら、ダメージを与えない（本家と同じ）
 * 注: 接触技の判定は物理技で近似している（せいでんき・ほのおのからだと同じ）。
 * 反動で攻撃側がひんしになったときの処理は扱わない。
 */
export class AftermathEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 4;

  async applyContactStatusCondition(
    defender: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<boolean> {
    if (battleContext?.attackerAbilityName === DAMP_ABILITY_NAME) {
      return false;
    }
    return super.applyContactStatusCondition(defender, attacker, battleContext);
  }

  /**
   * 特性を持つポケモンがひんしになったときだけ発動する
   */
  protected shouldActivate(defender: BattlePokemonStatus): boolean {
    return defender.currentHp === 0;
  }
}
