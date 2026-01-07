import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { BaseTypeImmunityEffect } from '../base/base-type-immunity-effect';

/**
 * でんきエンジン（Motor Drive）特性の効果
 * でんきタイプの技を無効化し、素早さを1段階上げる
 */
export class MotorDriveEffect extends BaseTypeImmunityEffect implements IAbilityEffect {
  protected readonly immuneTypes = ['でんき'] as const;

  /**
   * 場に出すときに発動
   * 素早さを1段階上げる
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    // 現在の素早さランクを取得
    const currentSpeedRank = pokemon.speedRank;

    // 新しいランクを計算（-6から+6の範囲内で）
    const newSpeedRank = Math.max(-6, Math.min(6, currentSpeedRank + 1));

    // 素早さランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      speedRank: newSpeedRank,
    });
  }
}
