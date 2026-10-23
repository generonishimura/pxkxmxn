import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { applyHeal } from '../../battle-events/heal';
import { IItemEffect } from '../item-effect.interface';

/**
 * かいがらのすず（Shell Bell）
 * 攻撃技で相手の HP を減らしたあと、減らした HP の合計の 1/8（切り捨て、最低 1）を回復する
 *
 * - 連続技は、全ヒットの合計から技のあとに 1 回だけ回復する（本家と同じ）
 * - かいふくふうじ中は回復しない（applyHeal が判定する）
 * 注: みがわりにだけ当たったときは回復しない（本家は、みがわりに与えたダメージでも回復する）
 * 注: 本家は、ちからずくで追加効果が消えた技・レッドカードで交代させられるときは回復しないが、ここでは回復する
 */
export class ShellBellEffect implements IItemEffect {
  private static readonly DIVISOR = 8;

  async onSourceAfterMoveHit(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    hit: HitResult,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const amount = Math.max(1, Math.floor(hit.damage / ShellBellEffect.DIVISOR));
    const healed = await applyHeal(holder, amount, battleContext);
    return healed > 0 ? 'restored a little HP using its かいがらのすず!' : null;
  }
}
