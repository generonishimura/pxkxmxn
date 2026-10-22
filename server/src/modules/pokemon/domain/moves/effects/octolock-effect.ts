import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * 逃げられない状態を受けないタイプ（第 6 世代から）
 */
const TRAP_IMMUNE_TYPE_NAME = 'ゴースト';

/**
 * たこがため（Octolock）技の効果
 *
 * 相手に octolock と trappedByStatusId（使用者）を書き、逃げられなくする。
 * 毎ターンの終わりに防御・特防を 1 段階ずつ下げるのと、交代の制限はエンジンが行う。
 * 使用者が引っ込む・ひんしになると解ける（エンジンが行う）。
 * 次のときは失敗する（本家と同じ）。
 * - 相手がゴーストタイプ（逃げられない状態を受けない。本家の onTryImmunity）
 * - 相手がすでにたこがためを受けている
 *
 * 注: タイプはポケモンの元のタイプで判定する（みずびたしなどで変わったタイプは見ない）
 */
export class OctolockEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      defender.trainedPokemonId,
    );
    const typeNames = [
      trainedPokemon?.pokemon.primaryType.name,
      trainedPokemon?.pokemon.secondaryType?.name,
    ];
    if (typeNames.includes(TRAP_IMMUNE_TYPE_NAME)) {
      return 'but it had no effect';
    }

    const applied = await tryApplyVolatile(
      defender,
      'octolock',
      { octolock: true, trappedByStatusId: attacker.id },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'can no longer escape because of Octolock!' : 'But it failed';
  }
}
