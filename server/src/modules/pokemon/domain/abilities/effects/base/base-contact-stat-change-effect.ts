import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatType } from './base-opponent-stat-change-effect';

/**
 * 能力ランクを変更する対象
 * - attacker: 接触技を使った攻撃側
 * - defender: 特性を持つ防御側（自分）
 */
export type ContactStatChangeTarget = 'attacker' | 'defender';

/**
 * 1つの能力ランク変化
 */
export interface ContactStatChange {
  readonly statType: StatType;
  readonly rankChange: number;
}

/**
 * 能力の種類と BattlePokemonStatus のランクのプロパティ名の対応
 */
const STAT_RANK_PROP_MAP = {
  attack: 'attackRank',
  defense: 'defenseRank',
  specialAttack: 'specialAttackRank',
  specialDefense: 'specialDefenseRank',
  speed: 'speedRank',
  accuracy: 'accuracyRank',
  evasion: 'evasionRank',
} as const satisfies Record<StatType, keyof BattlePokemonStatus>;

type StatRankProp = (typeof STAT_RANK_PROP_MAP)[StatType];

const MIN_RANK = -6;
const MAX_RANK = 6;

/**
 * 接触技を受けたときに能力ランクを変更する基底クラス
 * ぬめぬめ（Gooey）、カーリーヘアー（Tangling Hair）、くだけるよろい（Weak Armor）などで使用
 *
 * MoveExecutorService が接触時に呼び出す applyContactStatusCondition フックを利用する。
 * 対象が攻撃側で、ランクを下げる場合は、攻撃側の特性の canReceiveStatChange で無効化を判定する。
 * 注: 接触技の判定は物理技（moveCategory === 'Physical'）で近似している。
 */
export abstract class BaseContactStatChangeEffect implements IAbilityEffect {
  /**
   * 能力ランクを変更する対象
   */
  protected abstract readonly target: ContactStatChangeTarget;

  /**
   * 変更する能力ランクの一覧
   */
  protected abstract readonly statChanges: readonly ContactStatChange[];

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
   * 接触技を受けたときに能力ランクを変更する
   * MoveExecutorServiceから呼び出される
   *
   * @param defender 防御側のポケモン（特性を持つ側）
   * @param attacker 攻撃側のポケモン
   * @param battleContext バトルコンテキスト
   * @returns 能力ランクを1つ以上変更した場合はtrue、変更しなかった場合はfalse
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

    const targetPokemon = this.target === 'attacker' ? attacker : defender;
    if (targetPokemon.currentHp <= 0) {
      return false;
    }

    const updateData: Partial<Record<StatRankProp, number>> = {};
    let changed = false;
    for (const change of this.statChanges) {
      if (!(await this.canApply(targetPokemon, change, battleContext))) {
        continue;
      }
      const currentRank = targetPokemon.getStatRank(change.statType);
      const newRank = Math.max(MIN_RANK, Math.min(MAX_RANK, currentRank + change.rankChange));
      if (newRank === currentRank) {
        continue;
      }
      updateData[STAT_RANK_PROP_MAP[change.statType]] = newRank;
      changed = true;
    }

    if (!changed) {
      return false;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(targetPokemon.id, updateData);
    return true;
  }

  /**
   * 能力ランク変化を対象に適用できるかを判定する
   * 攻撃側のランクを下げる場合のみ、攻撃側の特性（クリアボディなど）で無効化を判定する
   */
  private async canApply(
    targetPokemon: BattlePokemonStatus,
    change: ContactStatChange,
    battleContext: BattleContext,
  ): Promise<boolean> {
    if (this.target !== 'attacker' || change.rankChange >= 0) {
      return true;
    }
    if (!battleContext.trainedPokemonRepository) {
      return true;
    }

    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      targetPokemon.trainedPokemonId,
    );
    if (!trainedPokemon?.ability) {
      return true;
    }

    // 動的インポートで循環参照を回避（base-contact-status-condition-effect.ts と同方針）
    const { AbilityRegistry } = await import('../../ability-registry');
    const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
    const canReceive = abilityEffect?.canReceiveStatChange?.(
      targetPokemon,
      change.statType,
      change.rankChange,
      battleContext,
    );
    return canReceive !== false;
  }
}
