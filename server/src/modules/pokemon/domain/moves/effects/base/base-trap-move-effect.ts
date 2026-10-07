import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';
import { moveEffectSource } from './base-stat-change-effect';

/**
 * 逃げられない状態を受けないタイプ（第 6 世代から）
 */
const TRAP_IMMUNE_TYPE_NAME = 'ゴースト';

/**
 * 相手を逃げられなくする変化技（くろいまなざし・とおせんぼう・クモのす）の基底クラス
 *
 * 相手に、使用者を指す trappedByStatusId を書く。交代できなくするのはエンジン（findSwitchBlocker）で、
 * 使用者が場を離れる・ひんしになると解ける（本家の trapped と trapper の linked volatile）。
 * 相手がすでに逃げられない状態・ゴーストタイプ・ひんしなら失敗する。
 * みがわりで防ぐのはエンジン（相手を対象にする変化技）
 * 注: ゴーストタイプかは元のタイプで判定する（エンジンの交代の判定と同じ。みずびたしなどの上書きは見ない）
 */
export abstract class BaseTrapMoveEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    if (await this.isTrapImmune(defender, battleContext)) {
      return 'But it failed';
    }
    const applied = await tryApplyVolatile(
      defender,
      'trap',
      { trappedByStatusId: attacker.id },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'The target can no longer escape!' : 'But it failed';
  }

  private async isTrapImmune(
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<boolean> {
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      defender.trainedPokemonId,
    );
    return (
      trainedPokemon?.pokemon.primaryType.name === TRAP_IMMUNE_TYPE_NAME ||
      trainedPokemon?.pokemon.secondaryType?.name === TRAP_IMMUNE_TYPE_NAME
    );
  }
}
