import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyHeal } from '../../battle-events/heal';
import { StatChange, applyStatChanges } from '../../battle-events/stat-change';
import { joinStatChangeMessages } from './base/base-stat-change-effect';

/**
 * のみこむ（Swallow）技の効果
 * たくわえた回数に応じて HP を回復し、たくわえるを終わらせる
 *
 * - たくわえていなければ（volatileState.stockpileCount がない）失敗する
 * - 回復量は最大 HP の 1/4（1 回）・1/2（2 回）・全部（3 回）。本家と同じく modify の丸め（4096 分率）で求める
 * - 回復できなくても（HP が満タン・かいふくふうじ中）、たくわえるは終わる（本家と同じ）
 * - たくわえるが終わると、stockpileBoosts の回数を rankChange: -回数 として applyStatChanges に渡す。
 *   stockpileBoosts はランクが変わった回数（1 回につき 1）で、ランクの差ではない。
 *   applyStatChanges を通すので、たんじゅん・あまのじゃくでも本家と同じ変化になる
 */
export class SwallowEffect implements IMoveEffect {
  /** たくわえた回数ごとの回復の割合（4096 分率） */
  private static readonly HEAL_MODIFIERS: readonly number[] = [1024, 2048, 4096];

  shouldFail(attacker: BattlePokemonStatus): boolean {
    return attacker.volatileState.stockpileCount === undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const count = attacker.volatileState.stockpileCount ?? 1;
    const healAmount = modifyByFixedPoint(attacker.maxHp, SwallowEffect.HEAL_MODIFIERS[count - 1]);
    const healed = await applyHeal(attacker, healAmount, battleContext);
    const messages = [healed > 0 ? `restored ${healed} HP!` : 'But it failed'];

    const statDropMessage = await this.endStockpile(attacker, battleContext);
    if (statDropMessage) {
      messages.push(statDropMessage);
    }
    return messages.join(' ');
  }

  /**
   * たくわえるを終わらせ、ランクが変わった回数（stockpileBoosts）の分だけ防御・特防を下げる（本家の stockpile の onEnd）
   * ランクを直接引かず、rankChange: -回数 を applyStatChanges に渡す
   */
  private async endStockpile(
    attacker: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const boosts = attacker.volatileState.stockpileBoosts;
    const updated = await battleContext.battleRepository?.patchVolatileState(attacker.id, {
      stockpileCount: null,
      stockpileBoosts: null,
    });
    const changes: StatChange[] = [];
    if (boosts && boosts.defense > 0) {
      changes.push({ statType: 'defense', rankChange: -boosts.defense });
    }
    if (boosts && boosts.specialDefense > 0) {
      changes.push({ statType: 'specialDefense', rankChange: -boosts.specialDefense });
    }
    if (!updated || changes.length === 0) {
      return null;
    }
    const result = await applyStatChanges(updated, changes, battleContext, {
      source: { pokemon: updated, kind: 'move', name: battleContext.moveName ?? 'のみこむ' },
    });
    return joinStatChangeMessages(result);
  }
}
