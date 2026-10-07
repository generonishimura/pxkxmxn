import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { HAZARD_KEYS, SCREEN_KEYS } from '@/modules/battle/domain/state/side-state';
import { clearSideConditions } from '../../battle-events/field-state';

/**
 * きりばらい（Defog）技の効果
 *
 * 相手の回避ランクを 1 段階下げる。そのあと、相手の陣営の壁（リフレクター・ひかりのかべ・オーロラベール）・
 * しんぴのまもり・しろいきりと、両方の陣営の設置技を消し、フィールドを消す（第 8 世代から）
 */
export class DefogEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'evasion';
  protected readonly rankChange = -1;

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const statMessage = await super.onUse(attacker, defender, battleContext);
    const repository = battleContext.battleRepository;
    if (!repository) {
      return statMessage;
    }
    const removed = [
      ...(await clearSideConditions(battleContext, defender.trainerId, [
        ...SCREEN_KEYS,
        'safeguardTurns',
        'mistTurns',
        ...HAZARD_KEYS,
      ])),
      ...(await clearSideConditions(battleContext, attacker.trainerId, HAZARD_KEYS)),
    ];
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    const terrainCleared = battle.field !== null && battle.field !== Field.None;
    if (terrainCleared) {
      await repository.update(battle.id, { field: Field.None });
      await repository.patchGlobalFieldState(battle.id, { terrainTurns: null });
    }
    const clearMessage =
      removed.length > 0 || terrainCleared ? 'The field was cleared by the fog!' : null;
    return [statMessage, clearMessage].filter((m): m is string => Boolean(m)).join(' ') || null;
  }
}
