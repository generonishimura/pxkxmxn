import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * しっとのほのお（Burning Jealousy）技の効果
 *
 * このターンに能力ランクが上がった相手を、やけどにする（追加効果。確率は 100%）。
 * 「上がった」は applyStatChanges が書く volatileState.statsRaisedTurn で判定する（本家の statsRaisedThisTurn）
 *
 * - 追加効果なので、てんのめぐみ・りんぷんの判定を通す（本家の secondary）
 * 注: ランクを直接書く効果（はらだいこ・じこあんじなど。docs/battle-engine-hooks.md 7 章）で上がったときは数えない
 */
export class BurningJealousyEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 1;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';

  /**
   * 技が当たったとき、相手のランクがこのターンに上がっていれば、やけどにする
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (defender.volatileState.statsRaisedTurn !== battleContext.battle.turn) {
      return null;
    }
    return super.onHit(attacker, defender, battleContext);
  }
}
