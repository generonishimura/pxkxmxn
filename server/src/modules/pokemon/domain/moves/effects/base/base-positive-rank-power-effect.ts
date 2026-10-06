import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * 上がっているランクの合計で威力が変わる技の基底クラス（例: つけあがる、おしおき）
 *
 * 威力 = basePower + powerPerRank × （対象の上がっているランクの合計）。maxPower があればそれを上限にする。
 * ランクは攻撃・防御・特攻・特防・素早さ・命中・回避の7つで、下がっているランクは数えない（本家の positiveBoosts と同じ）
 */
export abstract class BasePositiveRankPowerEffect implements IMoveEffect {
  /**
   * ランクを数える側（'attacker' = 技の使用者、'defender' = 相手）
   */
  protected abstract readonly rankOwner: 'attacker' | 'defender';

  /**
   * ランクが上がっていないときの威力
   */
  protected abstract readonly basePower: number;

  /**
   * 上がっているランク1段階ごとに増える威力
   */
  protected abstract readonly powerPerRank: number;

  /**
   * 威力の上限（ない場合は undefined）
   */
  protected readonly maxPower?: number;

  /**
   * ダメージ計算前に威力を決める
   */
  modifyMovePower(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): number {
    const owner = this.rankOwner === 'attacker' ? attacker : defender;
    const power =
      this.basePower + this.powerPerRank * BasePositiveRankPowerEffect.sumPositiveRanks(owner);
    return this.maxPower === undefined ? power : Math.min(power, this.maxPower);
  }

  /**
   * 上がっているランクの合計（下がっているランクは0として数える）
   */
  private static sumPositiveRanks(pokemon: BattlePokemonStatus): number {
    return [
      pokemon.attackRank,
      pokemon.defenseRank,
      pokemon.specialAttackRank,
      pokemon.specialDefenseRank,
      pokemon.speedRank,
      pokemon.accuracyRank,
      pokemon.evasionRank,
    ].reduce((sum, rank) => sum + Math.max(0, rank), 0);
  }
}
