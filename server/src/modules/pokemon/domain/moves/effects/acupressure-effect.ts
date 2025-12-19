import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base/base-stat-change-effect';

/**
 * 「つぼをつく」の特殊効果実装
 *
 * 効果: 味方のランダムなステータスを2段階上昇
 */
export class AcupressureEffect implements IMoveEffect {
  /**
   * ステータスの種類リスト
   */
  private static readonly STAT_TYPES: StatType[] = [
    'attack',
    'defense',
    'specialAttack',
    'specialDefense',
    'speed',
    'accuracy',
    'evasion',
  ];

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // ランダムなステータスを選択
    const randomIndex = Math.floor(Math.random() * AcupressureEffect.STAT_TYPES.length);
    const statType = AcupressureEffect.STAT_TYPES[randomIndex];

    // 現在のランクを取得
    const currentRank = attacker.getStatRank(statType);

    // 2段階上昇
    const newRank = Math.max(-6, Math.min(6, currentRank + 2));

    // ランクが変化しない場合は何もしない
    if (newRank === currentRank) {
      return null;
    }

    // statTypeからプロパティ名を取得してupdateDataを構築
    const propName = STAT_RANK_PROP_MAP[statType];
    const updateData: Partial<BattlePokemonStatus> = {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>;

    // ステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, updateData);

    // メッセージを返す
    const statName = STAT_NAME_MAP[statType];
    return `${statName} sharply rose!`;
  }
}

