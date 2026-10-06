import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * うるおいボイス（Liquid Voice）特性の効果
 * 音技（技フラグ sound）のタイプをみずにする。威力は変えない
 *
 * 注: 行動順のコンテキストの技タイプは技本来のタイプのまま（タイプ変更は反映しない）
 */
export class LiquidVoiceEffect implements IAbilityEffect {
  /**
   * 変更後のタイプ名
   */
  private static readonly WATER_TYPE_NAME = 'みず';

  modifyMoveType(
    _pokemon: BattlePokemonStatus,
    _typeName: string,
    battleContext?: BattleContext,
  ): string | undefined {
    if (battleContext?.moveFlags?.has('sound') !== true) {
      return undefined;
    }
    return LiquidVoiceEffect.WATER_TYPE_NAME;
  }
}
