import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「ミストフィールド」の特殊効果実装
 *
 * 効果: 5ターン間、地面にいるポケモンを状態異常から守る
 */
export class MistyTerrainEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const battle = battleContext.battle;

    // 既にミストフィールドの場合は変更しない
    if (battle.field === Field.MistyTerrain) {
      return null;
    }

    // フィールドをミストフィールドに変更
    await battleContext.battleRepository.update(battle.id, {
      field: Field.MistyTerrain,
    });

    return 'Misty Terrain was set up!';
  }
}

