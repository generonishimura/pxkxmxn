import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * ふんじん（Powder）技の効果
 * このターン、相手がほのお技を出そうとすると爆発させる
 *
 * - 相手に volatileState.powder を書く。ターン終了時に消える（本家の duration: 1）
 * - ほのお技を出そうとしたときの失敗と、最大 HP の 1/4 のダメージはエンジンが行う
 * - 粉技なので、くさタイプには効かない（ぼうじんは特性の isImmuneToMove で防ぐ）
 * - すでにふんじんをかけられている相手・ひんしの相手には失敗する
 */
export class PowderEffect implements IMoveEffect {
  /** 粉技が効かないタイプ */
  private static readonly IMMUNE_TYPE = 'くさ';

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      defender.trainedPokemonId,
    );
    const typeNames = [
      trainedPokemon?.pokemon.primaryType.name,
      trainedPokemon?.pokemon.secondaryType?.name,
    ];
    if (typeNames.includes(PowderEffect.IMMUNE_TYPE)) {
      return 'But it failed';
    }
    const applied = await tryApplyVolatile(defender, 'powder', { powder: true }, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return applied ? 'is covered in powder!' : 'But it failed';
  }
}
