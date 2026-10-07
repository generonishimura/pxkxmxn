import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatChange, applyStatChanges } from '../../battle-events/stat-change';
import { StatType, joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

/**
 * たくわえられる回数の上限
 */
const MAX_STOCKPILE_COUNT = 3;

/**
 * たくわえる（Stockpile）技の効果
 *
 * たくわえた回数（volatileState.stockpileCount）を 1 増やし、自分の防御・特防を 1 段階ずつ上げる。
 * すでに 3 回たくわえていると失敗する。
 * ランクが変わった能力は stockpileBoosts に 1 回につき 1 と数える（ランクの差ではない）。
 * はきだす・のみこむは rankChange: -値 を applyStatChanges に渡して戻す（ランクを直接引かない）。
 * 交代で引っ込むと、たくわえた回数もランクも消える（エンジンが volatileState を消す）。
 *
 * 注: 本家と同じく、ランクが変わった能力を 1 回につき 1 と数える（たんじゅんで 2 上がっても 1、
 *     +6 で上がらなければ 0）。はきだす・のみこむがこの量を applyStatChanges で下げれば、
 *     たんじゅん・あまのじゃくでも本家と同じ変化になる
 */
export class StockpileEffect implements IMoveEffect {
  shouldFail(attacker: BattlePokemonStatus): boolean {
    return (attacker.volatileState.stockpileCount ?? 0) >= MAX_STOCKPILE_COUNT;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }

    const count = (attacker.volatileState.stockpileCount ?? 0) + 1;
    const result = await applyStatChanges(
      attacker,
      [
        { statType: 'defense', rankChange: 1 },
        { statType: 'specialDefense', rankChange: 1 },
      ],
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    const boosts = attacker.volatileState.stockpileBoosts ?? { defense: 0, specialDefense: 0 };
    await repository.patchVolatileState(attacker.id, {
      stockpileCount: count,
      stockpileBoosts: {
        defense: boosts.defense + changedCount(result.applied, 'defense'),
        specialDefense: boosts.specialDefense + changedCount(result.applied, 'specialDefense'),
      },
    });

    return [`stockpiled ${count}!`, joinStatChangeMessages(result)]
      .filter((message): message is string => message !== null)
      .join(' ');
  }
}

/**
 * その能力のランクが変わったら 1、変わらなければ 0
 */
const changedCount = (applied: readonly StatChange[], statType: StatType): number =>
  applied.some(change => change.statType === statType && change.rankChange !== 0) ? 1 : 0;
