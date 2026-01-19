import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../../abilities/ability-registry';

/**
 * トライアタックで付与しうる状態異常
 */
const TRI_ATTACK_STATUS_CONDITIONS: {
  status: StatusCondition;
  immuneTypes: string[];
  message: string;
}[] = [
  { status: StatusCondition.Burn, immuneTypes: ['ほのお'], message: 'was burned!' },
  { status: StatusCondition.Freeze, immuneTypes: ['こおり'], message: 'was frozen solid!' },
  { status: StatusCondition.Paralysis, immuneTypes: ['でんき'], message: 'was paralyzed!' },
];

/**
 * 「トライアタック」の特殊効果実装
 *
 * 効果: 20%の確率でやけど・こおり・まひのいずれか1つをランダムに付与
 * (Has a 20% chance to burn, freeze, or paralyze the target)
 */
export class TriAttackEffect implements IMoveEffect {
  private static readonly CHANCE = 0.2;

  async onHit(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    if (Math.random() >= TriAttackEffect.CHANCE) {
      return null;
    }

    const trainedPokemon = await battleContext.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );
    if (!trainedPokemon) {
      return null;
    }

    // やけど・こおり・まひのいずれかをランダムに選択
    const shuffled = [...TRI_ATTACK_STATUS_CONDITIONS].sort(() => Math.random() - 0.5);
    for (const config of shuffled) {
      const hasImmuneType =
        config.immuneTypes.includes(trainedPokemon.pokemon.primaryType.name) ||
        (trainedPokemon.pokemon.secondaryType &&
          config.immuneTypes.includes(trainedPokemon.pokemon.secondaryType.name));
      if (hasImmuneType) {
        continue;
      }

      if (
        trainedPokemon.ability &&
        !AbilityRegistry.hasMoldBreaker(battleContext.attackerAbilityName)
      ) {
        const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
        if (abilityEffect?.canReceiveStatusCondition) {
          const canReceive = abilityEffect.canReceiveStatusCondition(
            defender,
            config.status,
            battleContext,
          );
          if (canReceive === false) {
            continue;
          }
        }
      }

      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        statusCondition: config.status,
      });
      return config.message;
    }

    return null;
  }
}
