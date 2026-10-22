import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getContextWeather } from '../../context-weather';

/**
 * サンパワー（Solar Power）特性の効果
 * はれのとき、特攻が 1.5 倍になる代わりに、ターン終了時に最大 HP の 1/8 を失う
 *
 * 注: 特攻 1.5 倍は、能力値ではなく与えるダメージの最終段に 1.5 倍を掛けることで近似する
 */
export class SolarPowerEffect implements IAbilityEffect {
  private static readonly SPECIAL_ATTACK_BOOST = 1.5;
  private static readonly HP_LOSS_RATIO = 1 / 8;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 天候を取得（battleContext.weather が優先、なければ battle.weather を使用）
    const weather = battleContext.weather ?? battleContext.battle?.weather ?? null;
    if (weather !== Weather.Sun) {
      return undefined;
    }
    if (battleContext.moveCategory !== 'Special') {
      return undefined;
    }
    return Math.floor(damage * SolarPowerEffect.SPECIAL_ATTACK_BOOST);
  }

  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }
    if (getContextWeather(battleContext) !== Weather.Sun) {
      return;
    }
    // すでにひんしなら何もしない
    if (pokemon.currentHp <= 0) {
      return;
    }

    const hpLoss = Math.max(1, Math.floor(pokemon.maxHp * SolarPowerEffect.HP_LOSS_RATIO));
    const newHp = Math.max(0, pokemon.currentHp - hpLoss);

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      currentHp: newHp,
    });
  }
}
