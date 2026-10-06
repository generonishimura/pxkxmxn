import { BaseTypeAbsorbEffect } from '../base/base-type-absorb-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * かんそうはだ（Dry Skin）特性の効果
 * - みずタイプの技を無効化し、最大 HP の 1/4 を回復する
 * - ほのおタイプの技で受けるダメージが 1.25 倍になる
 * - ターン終了時、雨なら最大 HP の 1/8 を回復し、晴れなら最大 HP の 1/8 のダメージを受ける
 *
 * 注: ほのお技の弱点は、技の威力補正ではなくダメージ計算の最終段で 1.25 倍を掛けて近似する
 */
export class DrySkinEffect extends BaseTypeAbsorbEffect {
  private static readonly FIRE_DAMAGE_MULTIPLIER = 1.25;
  private static readonly WEATHER_HP_RATIO = 1 / 8;

  protected readonly immuneTypes = ['みず'] as const;
  protected readonly healRatio = 0.25;

  /**
   * ダメージを受けるときに発動
   * ほのおタイプの技のダメージを 1.25 倍にする
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (battleContext?.moveTypeName !== 'ほのお') {
      return damage;
    }
    return Math.floor(damage * DrySkinEffect.FIRE_DAMAGE_MULTIPLIER);
  }

  /**
   * ターン終了時に発動
   * 雨なら HP を回復し、晴れなら HP が減る
   */
  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    const weather = battleContext.battle.weather;
    if (weather !== Weather.Rain && weather !== Weather.Sun) {
      return;
    }

    // 直前の状態異常ダメージなどを反映した最新の状態を取得
    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(
      pokemon.id,
    );
    if (!currentStatus) {
      return;
    }

    const amount = Math.max(1, Math.floor(currentStatus.maxHp * DrySkinEffect.WEATHER_HP_RATIO));
    const newHp =
      weather === Weather.Rain
        ? Math.min(currentStatus.maxHp, currentStatus.currentHp + amount)
        : Math.max(0, currentStatus.currentHp - amount);

    if (newHp === currentStatus.currentHp) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      currentHp: newHp,
    });
  }
}
