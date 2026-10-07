import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { StatType } from './base-opponent-stat-change-effect';
import { isContactMove } from '../../../moves/move-flags';
import { applyStatChanges } from '../../../battle-events/stat-change';

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
 * 接触技を受けたときに能力ランクを変更する基底クラス
 * ぬめぬめ（Gooey）、カーリーヘアー（Tangling Hair）、くだけるよろい（Weak Armor）などで使用
 *
 * 防御側の onDamagingHit フックで、ヒットごとに判定する（連続技ではヒットのたびに判定し、変えたランクを
 * 次のヒットのダメージ計算に使う。本家の onDamagingHit と同じ）。
 * ランクは applyStatChanges で変える。対象が攻撃側でランクを下げる場合は、攻撃側の特性
 * （canReceiveStatChange・reflectsStatDrops など）で無効化・反射を判定する。
 * 発動条件は trigger で選ぶ。'contact' は isContactMove（技フラグの contact）、'physical' は物理技で判定する。
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
   * 発動条件（'contact': 接触技を受けたとき、'physical': 物理技を受けたとき）
   */
  protected readonly trigger: 'contact' | 'physical' = 'contact';

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
   * 攻撃技が当たったヒットのたびに、発動条件を満たしていれば能力ランクを変更する
   *
   * @param holder 防御側のポケモン（特性を持つ側。ダメージ反映後の状態）
   * @param attacker 攻撃側のポケモン
   * @param _hit このヒットの情報（発動条件の判定は battleContext で行う）
   * @param battleContext バトルコンテキスト
   * @returns 能力ランクを変更した場合は「<特性名> activated!」、変更しなかった場合は null
   */
  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const applied = await this.applyContactStatusCondition(holder, attacker, battleContext);
    return applied ? `${battleContext?.defenderAbilityName} activated!` : null;
  }

  /**
   * 発動条件を満たしていれば能力ランクを変更する（onDamagingHit から、ヒットごとに呼ぶ）
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

    // 発動条件を満たさない場合は処理しない
    const triggered =
      this.trigger === 'physical'
        ? battleContext.moveCategory === 'Physical'
        : isContactMove(battleContext);
    if (!triggered) {
      return false;
    }

    const targetPokemon = this.target === 'attacker' ? attacker : defender;
    if (targetPokemon.currentHp <= 0) {
      return false;
    }

    // ランクを変える。原因はこの特性と持ち主（防御側）
    // 攻撃側のランクを下げるときは、攻撃側の特性（クリアボディ・ミラーアーマーなど）を applyStatChanges が判定する
    const result = await applyStatChanges(targetPokemon, this.statChanges, battleContext, {
      source: {
        pokemon: defender,
        abilityName: battleContext.defenderAbilityName,
        kind: 'ability',
        name: battleContext.defenderAbilityName,
      },
    });
    return result.applied.length > 0 || result.reflected.length > 0;
  }
}
