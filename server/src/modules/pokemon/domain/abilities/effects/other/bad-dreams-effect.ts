import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isIndirectDamagePrevented } from '../../../battle-events/indirect-damage';

/**
 * ナイトメア（Bad Dreams）特性の効果
 * ターン終了時、ねむり状態の相手のHPを最大HPの1/8（切り捨て、最低1）減らす
 *
 * 注: ターン終了時の処理は場のポケモンを1匹ずつ順に処理する。相手が先に処理され、
 * ねむりのターン数が尽きて目を覚ますと、この効果は発動しない。
 * 本家ではねむりは行動時に解除されるため、ターン終了時はまだねむっていてダメージを受ける
 */
export class BadDreamsEffect implements IAbilityEffect {
  /**
   * 最大HPに対するダメージの分母（1/8）
   */
  private static readonly DAMAGE_DIVISOR = 8;

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    const battle = battleContext.battle;
    const opponentTrainerId =
      pokemon.trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;

    const opponentPokemon =
      await battleContext.battleRepository.findActivePokemonByBattleIdAndTrainerId(
        battle.id,
        opponentTrainerId,
      );

    if (!opponentPokemon || opponentPokemon.isFainted()) {
      return;
    }

    if (opponentPokemon.statusCondition !== StatusCondition.Sleep) {
      return;
    }
    // 技以外のダメージを受けない特性（マジックガード）の相手には効かない
    if (await isIndirectDamagePrevented(opponentPokemon, battleContext)) {
      return;
    }

    const damage = Math.max(1, Math.floor(opponentPokemon.maxHp / BadDreamsEffect.DAMAGE_DIVISOR));
    const newHp = Math.max(0, opponentPokemon.currentHp - damage);

    await battleContext.battleRepository.updateBattlePokemonStatus(opponentPokemon.id, {
      currentHp: newHp,
    });
  }
}
