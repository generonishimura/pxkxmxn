import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * フィールドごとに、しぜんのちからが出す技（第9世代）
 */
const MOVE_BY_FIELD: Readonly<Record<Field, string>> = {
  [Field.None]: 'トライアタック',
  [Field.ElectricTerrain]: '１０まんボルト',
  [Field.GrassyTerrain]: 'エナジーボール',
  [Field.MistyTerrain]: 'ムーンフォース',
  [Field.PsychicTerrain]: 'サイコキネシス',
};

/**
 * しぜんのちから（Nature Power）技の効果
 * 場のフィールドに応じた技を出す（第9世代）
 *
 * - フィールドなし: トライアタック
 * - エレキフィールド: １０まんボルト、グラスフィールド: エナジーボール、
 *   ミストフィールド: ムーンフォース、サイコフィールド: サイコキネシス
 * 注: 相手にみがわりがあると、本家は出した技がみがわりに当たるが、ここではしぜんのちから自体が失敗する
 *     （エンジンが、相手を対象にする変化技をみがわりで止めるため）
 */
export class NaturePowerEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.callMove) {
      return 'But it failed';
    }
    const moveName = MOVE_BY_FIELD[battleContext.battle.field ?? Field.None];
    return battleContext.callMove({ moveName, calledBy: 'しぜんのちから' });
  }
}
