import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * シェルアームズ（Shell Side Arm）技の効果
 *
 * - 物理技と特殊技のうち、相手に与えるダメージが大きい方になる（DB の分類は特殊）。物理技になったら接触技になる
 * - 20% の確率で相手をどくにする
 *
 * 比べ方は本家（Showdown の onModifyMove）と同じく、威力 90 のダメージ式の途中まで
 * floor(floor(floor(floor(2 × Lv / 5 + 2) × 90 × 攻撃) / 防御) / 50) を物理・特殊で求める。
 * 能力はランク込みで、特性・持ち物の補正は掛けない。同じ値なら半々で物理技になる
 *
 * 注: ワンダールームの防御と特防の入れ替えは見ない（本家の getStat は入れ替える）
 */
export class ShellSideArmEffect extends BaseStatusConditionEffect {
  /**
   * このエンジンのダメージ計算のレベル（DamageCalculator と同じ）
   */
  private static readonly LEVEL = 50;
  private static readonly BASE_POWER = 90;

  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.2;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';

  readonly contactWhenPhysical = true;

  modifyMoveCategory(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): 'Physical' | 'Special' | undefined {
    const attackerStats = battleContext.attackerStats;
    const defenderStats = battleContext.defenderStats;
    if (!attackerStats || !defenderStats) {
      return undefined;
    }
    const boosted = (
      status: BattlePokemonStatus,
      value: number,
      stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense',
    ) => Math.floor(value * status.getStatMultiplier(stat));
    const physical = ShellSideArmEffect.partialDamage(
      boosted(attacker, attackerStats.attack, 'attack'),
      boosted(defender, defenderStats.defense, 'defense'),
    );
    const special = ShellSideArmEffect.partialDamage(
      boosted(attacker, attackerStats.specialAttack, 'specialAttack'),
      boosted(defender, defenderStats.specialDefense, 'specialDefense'),
    );
    if (physical > special || (physical === special && Math.random() < 0.5)) {
      return 'Physical';
    }
    return 'Special';
  }

  /**
   * 威力 90 のダメージ式の途中までの値（本家の onModifyMove と同じ切り捨て）
   */
  private static partialDamage(attack: number, defense: number): number {
    const levelFactor = Math.floor((2 * ShellSideArmEffect.LEVEL) / 5 + 2);
    return Math.floor(
      Math.floor(Math.floor(levelFactor * ShellSideArmEffect.BASE_POWER * attack) / defense) / 50,
    );
  }
}
