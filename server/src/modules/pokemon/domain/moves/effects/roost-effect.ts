import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { BaseSelfHealEffect, HealFraction } from './base/base-self-heal-effect';

/**
 * はねやすめ（Roost）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/2（四捨五入）回復し、このターンの終わりまでひこうタイプを失う
 * - ひこうタイプを失うのはエンジン（volatileState.roosting。ターン終了時に消える）。ひこうタイプだけならノーマルタイプになる
 * - HP が満タン・かいふくふうじ中で回復できないときは失敗し、ひこうタイプも失わない（本家は回復に失敗すると self の roost を付けない）
 */
export class RoostEffect extends BaseSelfHealEffect {
  protected getHealFraction(): HealFraction {
    return { numerator: 1, denominator: 2 };
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const message = await super.onUse(attacker, defender, battleContext);
    if (
      message === null ||
      message.startsWith('But it failed') ||
      !battleContext.battleRepository
    ) {
      return message;
    }
    await battleContext.battleRepository.patchVolatileState(attacker.id, { roosting: true });
    return message;
  }
}
