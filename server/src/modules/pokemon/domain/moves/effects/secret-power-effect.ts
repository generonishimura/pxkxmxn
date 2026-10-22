import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BaseStatChangeEffect } from './base/base-stat-change-effect';
import { rollSecondaryEffect } from '../secondary-effect';

/**
 * ひみつのちからの追加効果: 相手をまひにする（確率判定は SecretPowerEffect 側で行う）
 */
class SecretPowerParalysis extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}

/**
 * ひみつのちからの追加効果: 相手をねむりにする（確率判定は SecretPowerEffect 側で行う）
 */
class SecretPowerSleep extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Sleep;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'fell asleep!';
}

/**
 * ひみつのちからの追加効果: 相手のとくこうを1段階下げる（確率判定は SecretPowerEffect 側で行う）
 */
class SecretPowerSpecialAttackDrop extends BaseStatChangeEffect {
  protected readonly statType = 'specialAttack' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 1.0;
}

/**
 * ひみつのちからの追加効果: 相手のすばやさを1段階下げる（確率判定は SecretPowerEffect 側で行う）
 */
class SecretPowerSpeedDrop extends BaseStatChangeEffect {
  protected readonly statType = 'speed' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 1.0;
}

/**
 * ひみつのちから（Secret Power）技の効果
 *
 * 効果: 30%の確率で、フィールドに応じた追加効果を相手に与える
 * - エレキフィールド: まひ
 * - グラスフィールド: ねむり
 * - ミストフィールド: とくこう1段階ダウン
 * - サイコフィールド: すばやさ1段階ダウン
 * - フィールドなし: まひ
 *
 * 注: フィールドがないとき、本来はバトルの地形（環境）で効果が決まる。ここでは通信対戦の標準（まひ）を使う
 */
export class SecretPowerEffect implements IMoveEffect {
  private static readonly CHANCE = 0.3;

  private readonly paralysis = new SecretPowerParalysis();
  private readonly sleep = new SecretPowerSleep();
  private readonly specialAttackDrop = new SecretPowerSpecialAttackDrop();
  private readonly speedDrop = new SecretPowerSpeedDrop();

  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (!rollSecondaryEffect(SecretPowerEffect.CHANCE, battleContext)) {
      return null;
    }

    return this.selectEffect(battleContext.battle.field).onHit(attacker, defender, battleContext);
  }

  /**
   * フィールドに応じた追加効果を選ぶ
   */
  private selectEffect(field: Field | null): Required<Pick<IMoveEffect, 'onHit'>> {
    switch (field) {
      case Field.GrassyTerrain:
        return this.sleep;
      case Field.MistyTerrain:
        return this.specialAttackDrop;
      case Field.PsychicTerrain:
        return this.speedDrop;
      case Field.ElectricTerrain:
      default:
        return this.paralysis;
    }
  }
}
