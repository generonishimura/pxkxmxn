import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base-stat-change-effect';

/**
 * 場にいるくさタイプのポケモン全員の能力ランクを上げる変化技の基底クラス
 *
 * 例: たがやす（攻撃+1, 特攻+1）、フラワーガード（防御+1）
 *
 * - 自分と相手のタイプを trainedPokemonRepository から取得し、くさタイプの側だけ能力を上げる
 * - どちらもくさタイプでない場合は失敗（null を返す）
 * - 各ステータス変化は独立して試行（一つが既に上限でも他は変化する）
 */
export abstract class BaseGrassTypeStatBoostEffect implements IMoveEffect {
  private static readonly GRASS_TYPE_NAME = 'くさ';

  /**
   * くさタイプのポケモンに適用するステータスとランク変化の組み合わせ
   */
  protected abstract readonly statChanges: ReadonlyArray<{
    statType: StatType;
    rankChange: number;
  }>;

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    const targets: ReadonlyArray<{ label: string; status: BattlePokemonStatus }> = [
      { label: 'user', status: attacker },
      { label: 'target', status: defender },
    ];

    const messages: string[] = [];
    for (const { label, status } of targets) {
      if (!(await this.isGrassType(status, battleContext))) {
        continue;
      }
      messages.push(...(await this.applyStatChanges(label, status, battleContext)));
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }

  private async applyStatChanges(
    label: string,
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string[]> {
    const updateData: Partial<BattlePokemonStatus> = {};
    const messages: string[] = [];

    for (const { statType, rankChange } of this.statChanges) {
      const currentRank = target.getStatRank(statType);
      const newRank = Math.max(-6, Math.min(6, currentRank + rankChange));
      if (newRank === currentRank) {
        continue;
      }
      const propName = STAT_RANK_PROP_MAP[statType];
      (updateData as Record<string, number>)[propName] = newRank;
      const direction = rankChange > 0 ? 'rose' : 'fell';
      messages.push(`${label}'s ${STAT_NAME_MAP[statType]} ${direction}!`);
    }

    if (messages.length > 0) {
      await battleContext.battleRepository?.updateBattlePokemonStatus(target.id, updateData);
    }
    return messages;
  }

  private async isGrassType(
    target: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      target.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return false;
    }
    const grass = BaseGrassTypeStatBoostEffect.GRASS_TYPE_NAME;
    return (
      trainedPokemon.pokemon.primaryType.name === grass ||
      trainedPokemon.pokemon.secondaryType?.name === grass
    );
  }
}
