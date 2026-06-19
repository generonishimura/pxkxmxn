import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 「サイコフィールド」の特殊効果実装
 *
 * 効果: 5ターン間、地面にいるポケモンを先制技から守り、エスパー技の威力を1.5倍にする
 *
 * 注: 「地面にいるポケモンへの先制技ブロック」「エスパー技威力 1.5倍」のダメージ計算側修正は
 *     現状の damage calculator / accuracy checker に対応するフックがなく、別処理（engine 拡張）で扱う想定。
 *     ここではフィールド変更のみを担う。
 */
export class PsychicTerrainEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const battle = battleContext.battle;

    if (battle.field === Field.PsychicTerrain) {
      return null;
    }

    await battleContext.battleRepository.update(battle.id, {
      field: Field.PsychicTerrain,
    });

    return 'Psychic Terrain was set up!';
  }
}
