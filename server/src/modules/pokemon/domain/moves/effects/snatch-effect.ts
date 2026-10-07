import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';

/**
 * よこどり（Snatch）技の効果
 *
 * このターンの間、使用者に snatch を書く（ターン終了時にエンジンが消す）。
 * 相手がこのあと奪える変化技（MoveBehaviors の snatch）を出すと、エンジンが代わりに使用者に出させる
 * 注: ゆびをふるなどで呼ばれた技は奪わない（エンジンが呼ばれた技では判定しない。本家は奪う）
 */
export class SnatchEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(attacker, 'snatch', { snatch: true }, battleContext);
    return applied ? 'waits for a target to make a move!' : 'But it failed';
  }
}
