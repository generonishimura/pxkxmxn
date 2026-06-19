import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「エレキフィールド」の特殊効果実装
 *
 * 効果: 5ターン間、地面にいるポケモンを眠り状態にできず、電気技の威力を1.5倍にする
 *
 * 注: 「眠り防止」「電気技 1.5倍」のダメージ計算側修正は別処理（engine 拡張）
 */
export class ElectricTerrainEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const battle = battleContext.battle;

    if (battle.field === Field.ElectricTerrain) {
      return null;
    }

    await battleContext.battleRepository.update(battle.id, {
      field: Field.ElectricTerrain,
    });

    return 'Electric Terrain was set up!';
  }
}
