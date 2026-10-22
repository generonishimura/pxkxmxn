import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatCalculator } from '@/modules/battle/domain/logic/stat-calculator';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { applyDrainHeal } from '../../battle-events/drain-heal';

/**
 * ちからをすいとる の後半（相手の攻撃ランク -1）
 */
class StrengthSapAttackDropEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = -1;
}

/**
 * ちからをすいとる（Strength Sap）技の効果
 *
 * 効果: 相手の攻撃の値（ランク補正込み）だけ自分の HP を回復し、相手の攻撃ランクを1段階下げる
 *
 * - 回復量は、下げる前の攻撃の実数値 × ランク補正（切り捨て）。最大 HP を超えない
 * - 回復は applyDrainHeal で行う。相手がヘドロえきなら、回復せずに同じ量のダメージを受ける（HPが満タンでも受ける）
 * - 相手の攻撃ランクが既に -6 の場合は失敗
 * - 自分の HP が満タンでも、相手の攻撃ランクは下げる
 * - 特性（クリアボディなど）で攻撃ランクが下がらなくても、HP は回復する
 */
export class StrengthSapEffect implements IMoveEffect {
  private readonly attackDropEffect = new StrengthSapAttackDropEffect();

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    if (defender.attackRank <= -6) {
      return null;
    }

    const defenderTrainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!defenderTrainedPokemon) {
      return null;
    }

    const messages: string[] = [];

    const attack = this.calculateAttack(defenderTrainedPokemon);
    const healAmount = Math.max(1, Math.floor(attack * defender.getStatMultiplier('attack')));
    const { healed, damaged } = await applyDrainHeal(attacker, defender, healAmount, battleContext);
    if (healed > 0) {
      messages.push('HP was restored!');
    }
    if (damaged > 0) {
      messages.push('sucked up the liquid ooze!');
    }

    const attackDropMessage = await this.attackDropEffect.onUse(attacker, defender, battleContext);
    if (attackDropMessage) {
      messages.push(attackDropMessage);
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }

  /**
   * 育成個体から攻撃の実数値（ランク補正なし）を計算する
   */
  private calculateAttack(trainedPokemon: TrainedPokemon): number {
    return StatCalculator.calculate({
      baseHp: trainedPokemon.pokemon.baseHp,
      baseAttack: trainedPokemon.pokemon.baseAttack,
      baseDefense: trainedPokemon.pokemon.baseDefense,
      baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
      baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
      baseSpeed: trainedPokemon.pokemon.baseSpeed,
      level: trainedPokemon.level,
      ivHp: trainedPokemon.ivHp,
      ivAttack: trainedPokemon.ivAttack,
      ivDefense: trainedPokemon.ivDefense,
      ivSpecialAttack: trainedPokemon.ivSpecialAttack,
      ivSpecialDefense: trainedPokemon.ivSpecialDefense,
      ivSpeed: trainedPokemon.ivSpeed,
      evHp: trainedPokemon.evHp,
      evAttack: trainedPokemon.evAttack,
      evDefense: trainedPokemon.evDefense,
      evSpecialAttack: trainedPokemon.evSpecialAttack,
      evSpecialDefense: trainedPokemon.evSpecialDefense,
      evSpeed: trainedPokemon.evSpeed,
      nature: trainedPokemon.nature,
    }).attack;
  }
}
