import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';
import { consumeItem } from '../../battle-events/item-lookup';
import { EffectSource } from '../../battle-events/effect-source';

/**
 * 治した状態の、メッセージでの呼び方
 */
const CURED_NAMES: Partial<Record<StatusCondition, string>> = {
  [StatusCondition.Paralysis]: 'paralysis',
  [StatusCondition.Sleep]: 'sleep',
  [StatusCondition.Poison]: 'poison',
  [StatusCondition.BadPoison]: 'poison',
  [StatusCondition.Burn]: 'burn',
  [StatusCondition.Freeze]: 'freeze',
};

/**
 * 状態異常・こんらんを治すきのみ
 * クラボのみ（まひ）・カゴのみ（ねむり）・モモンのみ（どく・もうどく）・チーゴのみ（やけど）・
 * ナナシのみ（こおり）・キーのみ（こんらん）・ラムのみ（すべての状態異常とこんらん）
 *
 * 本家と同じく、治せる状態になったらすぐに食べて治す
 * - onStatusInflicted: 状態異常・こんらんにされたとき
 * - onUpdate: すでにその状態のとき（ねむるで眠ったあと など）
 *
 * 注: 相手のきんちょうかんで食べられなくなる効果は、きんちょうかんがまだないので見ていない
 */
export class StatusCureBerryEffect implements IItemEffect {
  /**
   * @param curableStatuses 治す状態異常
   * @param curesConfusion こんらんを治すか
   */
  constructor(
    private readonly curableStatuses: readonly StatusCondition[],
    private readonly curesConfusion: boolean,
  ) {}

  async onStatusInflicted(
    holder: BattlePokemonStatus,
    _statusCondition: StatusCondition,
    _source: EffectSource | undefined,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    return battleContext ? this.cure(holder, battleContext) : null;
  }

  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.cure(holder, battleContext);
  }

  /**
   * 治せる状態なら、きのみを食べて治す
   */
  private async cure(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository || holder.currentHp <= 0) {
      return null;
    }
    const status = holder.statusCondition;
    const curesStatus = status !== null && this.curableStatuses.includes(status);
    const curesConfusion = this.curesConfusion && holder.volatileState.confusionTurns !== undefined;
    if (!curesStatus && !curesConfusion) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    if (!itemName) {
      return null;
    }

    const cured: string[] = [];
    if (curesStatus) {
      await repository.updateBattlePokemonStatus(holder.id, {
        statusCondition: StatusCondition.None,
      });
      // ねむる・こおりのターン数は、その状態でなくなったら消す（persistent-state.ts）
      const { sleepTurns, freezeTurns } = holder.persistentState;
      if (sleepTurns !== undefined || freezeTurns !== undefined) {
        await repository.patchPersistentState(holder.id, { sleepTurns: null, freezeTurns: null });
      }
      cured.push(CURED_NAMES[status] ?? 'status');
    }
    if (curesConfusion) {
      await repository.patchVolatileState(holder.id, { confusionTurns: null });
      cured.push('confusion');
    }
    return `${itemName} cured its ${cured.join(' and ')}!`;
  }
}
