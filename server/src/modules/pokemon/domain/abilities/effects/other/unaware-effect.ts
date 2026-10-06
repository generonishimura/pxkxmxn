import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import type { StatType } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * てんねん（Unaware）特性の効果
 * 相手の能力ランクを無視してダメージと命中を計算する
 *
 * - 攻撃するとき: 相手の防御・特防・回避のランクを無視する
 * - 攻撃を受けるとき: 相手の攻撃・防御・特攻・命中のランクを無視する
 *   （防御はボディプレスが自分の防御で攻撃するため）
 *
 * 自分のランクはそのまま使う。攻撃を受けるときの効果はかたやぶりで無視される（本家と同じ）
 */
export class UnawareEffect implements IAbilityEffect {
  private static readonly IGNORED_WHEN_ATTACKING: readonly StatType[] = [
    'defense',
    'specialDefense',
    'evasion',
  ];

  private static readonly IGNORED_WHEN_DEFENDING: readonly StatType[] = [
    'attack',
    'defense',
    'specialAttack',
    'accuracy',
  ];

  ignoreOpponentRanks(
    _pokemon: BattlePokemonStatus,
    role: 'attacker' | 'defender',
  ): readonly StatType[] {
    return role === 'attacker'
      ? UnawareEffect.IGNORED_WHEN_ATTACKING
      : UnawareEffect.IGNORED_WHEN_DEFENDING;
  }
}
