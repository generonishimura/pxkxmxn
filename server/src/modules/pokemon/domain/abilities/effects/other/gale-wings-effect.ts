import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * はやてのつばさ（Gale Wings）特性の効果
 * HPが満タンのとき、ひこうタイプの技の優先度を +1 する（第7世代以降）
 *
 * 技のタイプは、技本来のタイプ（コンテキストの `moveTypeName`）で判定する。
 * スカイスキンなどのタイプ変更は反映しない
 */
export class GaleWingsEffect implements IAbilityEffect {
  modifyPriority(
    pokemon: BattlePokemonStatus,
    movePriority: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveTypeName !== 'ひこう' || pokemon.currentHp !== pokemon.maxHp) {
      return undefined;
    }
    return movePriority + 1;
  }
}
