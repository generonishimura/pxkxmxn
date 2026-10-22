import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext, BattleStatValues } from '../../battle-context.interface';
import { getHighestStat, NonHpStat } from '@/modules/battle/domain/logic/highest-stat';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 条件を満たす間、一番高い能力を上げる特性の基底クラス（こだいかっせい、クォークチャージ）
 *
 * 一番高い能力は getHighestStat（ランク補正込みの実数値）で選ぶ。
 * 攻撃・防御・特攻・特防なら 5325/4096（約 1.3）倍、素早さなら 1.5 倍にする。
 * - 攻撃・特攻: 攻撃側の modifyDamageDealt で、与えるダメージに 5325/4096 倍を掛ける
 * - 防御・特防: 防御側の modifyDamage で、受けるダメージに 4096/5325 倍を掛ける
 * - 素早さ: modifySpeed で 6144/4096 倍を掛ける
 *
 * 本家では、この効果はかたやぶりで無視されないため unaffectedByMoldBreaker を true にする。
 *
 * 注: 攻撃・防御などの能力値ではなく、ダメージの最終段に補正を掛けて近似する。
 *     ダメージ式の +2 とタイプ一致・タイプ相性の倍率にも補正が掛かるため、本家と数ポイント違うことがある
 *     （タイプ一致や効果ばつぐんのときほど差が大きい）
 * 注: 本家は発動したときに一番高い能力を決めて固定するが、ここでは判定のたびに今のランクで選び直す
 * 注: ボディプレス（自分の防御で攻撃）・イカサマ（相手の攻撃で攻撃）でも、物理技は攻撃・特殊技は特攻で判定する
 */
export abstract class BaseHighestStatBoostEffect implements IAbilityEffect {
  private static readonly STAT_MULTIPLIER = 5325;
  private static readonly SPEED_MULTIPLIER = 6144;
  private static readonly FIXED_POINT_BASE = 4096;

  readonly unaffectedByMoldBreaker = true;

  /**
   * 効果が発動している（はれ・エレキフィールドなど）かどうか
   */
  protected abstract isActive(battleContext: BattleContext): boolean;

  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const offenseStat =
      battleContext?.moveCategory === 'Physical'
        ? 'attack'
        : battleContext?.moveCategory === 'Special'
          ? 'specialAttack'
          : undefined;
    if (
      !offenseStat ||
      !this.isBoosted(offenseStat, pokemon, battleContext?.attackerStats, battleContext)
    ) {
      return undefined;
    }
    return modifyByFixedPoint(damage, BaseHighestStatBoostEffect.STAT_MULTIPLIER);
  }

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    const defenseStat =
      battleContext?.moveCategory === 'Physical'
        ? 'defense'
        : battleContext?.moveCategory === 'Special'
          ? 'specialDefense'
          : undefined;
    if (
      !defenseStat ||
      !this.isBoosted(defenseStat, pokemon, battleContext?.defenderStats, battleContext)
    ) {
      return damage;
    }
    return modifyByFixedPoint(
      damage,
      BaseHighestStatBoostEffect.FIXED_POINT_BASE,
      BaseHighestStatBoostEffect.STAT_MULTIPLIER,
    );
  }

  modifySpeed(
    pokemon: BattlePokemonStatus,
    speed: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!this.isBoosted('speed', pokemon, battleContext?.attackerStats, battleContext)) {
      return undefined;
    }
    return modifyByFixedPoint(speed, BaseHighestStatBoostEffect.SPEED_MULTIPLIER);
  }

  /**
   * 効果が発動していて、stat が一番高い能力かどうか
   */
  private isBoosted(
    stat: NonHpStat,
    pokemon: BattlePokemonStatus,
    stats: BattleStatValues | undefined,
    battleContext: BattleContext | undefined,
  ): boolean {
    if (!battleContext || !stats || !this.isActive(battleContext)) {
      return false;
    }
    return getHighestStat(stats, pokemon) === stat;
  }
}
