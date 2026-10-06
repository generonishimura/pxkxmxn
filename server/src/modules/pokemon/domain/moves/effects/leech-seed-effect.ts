import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * やどりぎのタネ（Leech Seed）技の効果
 * 相手にやどりぎのタネを植える（leechSeed）
 *
 * - くさタイプ・すでに植えられている相手には失敗する（tryApplyVolatile が判定する）
 * - ターン終了時に相手の最大 HP の 1/8 を吸い、自分の場のポケモンが回復するのはエンジンが行う
 * - 交代で消え、バトンタッチで引き継がれるのもエンジンが行う
 *
 * 注: エンジンは変化技の命中判定をしないので、命中率 90% でも必ず当たる
 */
export class LeechSeedEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      defender,
      'leechSeed',
      { leechSeed: true },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'was seeded!' : 'But it failed';
  }
}
