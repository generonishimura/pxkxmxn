import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { SCREEN_KEYS } from '@/modules/battle/domain/state/side-state';
import { BattleContext } from '../../battle-context.interface';
import { clearSideConditions } from '../../../battle-events/field-state';

/**
 * バリアフリー（Screen Cleaner）特性の効果
 * 場に出たとき、自分と相手の両方の陣営のリフレクター・ひかりのかべ・オーロラベールを消す
 *
 * - 壁ではない陣営の状態（おいかぜ・しんぴのまもり・設置技など）は消さない
 * 注: 場に出たときの特性はメッセージを返せないため、「バリアフリーが発動した」という表示は出ない
 */
export class ScreenCleanerEffect implements IAbilityEffect {
  async onEntry(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext) {
      return;
    }
    const { trainer1Id, trainer2Id } = battleContext.battle;
    await clearSideConditions(battleContext, trainer1Id, SCREEN_KEYS);
    await clearSideConditions(battleContext, trainer2Id, SCREEN_KEYS);
  }
}
