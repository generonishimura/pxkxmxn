import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isContactMove } from '../../../moves/move-flags';
import {
  StatusInflictionOptions,
  canInflictStatus,
  inflictStatus,
} from '../../../battle-events/status-infliction';

/**
 * 接触技を受けたときに状態異常を付与する基底クラス
 * どくのトゲ（Poison Point）、せいでんき（Static）、ほのおのからだ（Flame Body）、ほうし（Effect Spore）などで使用
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 * 防御側の onDamagingHit フックで、接触したヒットごとに判定する（連続技ではヒットのたびに判定する。
 * 本家の onDamagingHit と同じ）
 */
export abstract class BaseContactStatusConditionEffect implements IAbilityEffect {
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
   * 付与する状態異常
   */
  protected abstract readonly statusCondition: StatusCondition;

  /**
   * 状態異常を付与する確率（0.0-1.0、例: 0.3は30%）
   */
  protected abstract readonly chance: number;

  /**
   * 状態異常を付与できないタイプ（免疫タイプ）
   */
  protected abstract readonly immuneTypes: readonly string[];

  /**
   * 付与する状態異常を抽選する
   * 既定では chance の確率で statusCondition を返す（chanceが1.0の場合は必ず返す）。
   * ほうし（Effect Spore）のように複数の状態異常から選ぶ特性は、このメソッドを上書きする。
   *
   * @returns 付与する状態異常、付与しない場合はnull
   */
  protected selectStatusCondition(): StatusCondition | null {
    if (this.chance < 1.0 && Math.random() >= this.chance) {
      return null;
    }
    return this.statusCondition;
  }

  /**
   * 抽選した状態異常ごとの免疫タイプを返す
   * 既定では状態異常に関係なく immuneTypes を返す。
   * ほうし（Effect Spore）のように状態異常ごとに効かないタイプが違う特性は、このメソッドを上書きする。
   *
   * @param _statusCondition 抽選で選ばれた状態異常
   * @returns その状態異常を付与できないタイプ
   */
  protected immuneTypesFor(_statusCondition: StatusCondition): readonly string[] {
    return this.immuneTypes;
  }

  /**
   * 攻撃技が当たったヒットのたびに、接触していれば状態異常の付与を判定する
   *
   * @param holder 防御側のポケモン（特性を持つ側。ダメージ反映後の状態）
   * @param attacker 攻撃側のポケモン（状態異常を付与される側）
   * @param _hit このヒットの情報（接触の判定は battleContext で行う）
   * @param battleContext バトルコンテキスト
   * @returns 付与した場合は「<特性名> activated!」、付与しなかった場合は null
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
   * 接触技を受けたときに状態異常を付与する（onDamagingHit から、ヒットごとに呼ぶ）
   *
   * @param defender 防御側のポケモン（状態異常を付与される側）
   * @param attacker 攻撃側のポケモン（状態異常を付与する側）
   * @param battleContext バトルコンテキスト
   * @returns 状態異常を付与した場合はtrue、付与しなかった場合はfalse
   */
  async applyContactStatusCondition(
    defender: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<boolean> {
    if (!battleContext?.battleRepository || !battleContext.trainedPokemonRepository) {
      return false;
    }

    // 接触技でない場合は処理しない（えんかくなどで接触しなくなった技を含む）
    if (!isContactMove(battleContext)) {
      return false;
    }

    // 既に状態異常がある場合は付与しない（確率判定の前に判定する）
    if (attacker.statusCondition && attacker.statusCondition !== StatusCondition.None) {
      return false;
    }

    // 確率判定と付与する状態異常の決定
    const statusCondition = this.selectStatusCondition();
    if (statusCondition === null) {
      return false;
    }

    // 付与できるか（選ばれた状態異常ごとのタイプ免疫・攻撃側の特性）。付与元はこの特性と持ち主
    const options: StatusInflictionOptions = {
      source: {
        pokemon: defender,
        abilityName: battleContext.defenderAbilityName,
        kind: 'ability',
        name: battleContext.defenderAbilityName,
      },
      immuneTypes: this.immuneTypesFor(statusCondition),
    };
    if (!(await canInflictStatus(attacker, statusCondition, battleContext, options))) {
      return false;
    }

    // 状態異常を付与（付与されたあとの特性も呼ぶ）
    // 注: このフックは boolean しか返せないため、シンクロなどのメッセージは捨てる。ログは「<特性名> activated!」だけになる
    await inflictStatus(attacker, statusCondition, battleContext, options);

    return true;
  }
}
