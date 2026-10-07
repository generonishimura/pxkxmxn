import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * テレポート（Teleport）技の効果
 *
 * 使用者が控えのポケモンと交代する（第 8 世代からのトレーナー戦の効果。優先度 -6 は DB の値）。
 * 控え（ひんしでないポケモン）がいなければ失敗する。交代はエンジンが行う（selfSwitch）
 */
export class TeleportEffect implements IMoveEffect {
  readonly selfSwitch = true;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return (await hasSwitchTarget(battleContext, attacker.trainerId)) ? null : 'But it failed';
  }
}
