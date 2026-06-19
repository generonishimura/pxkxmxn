import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { BaseTypeImmunityEffect } from '../base/base-type-immunity-effect';

/**
 * そうしょく（Sap Sipper）特性の効果
 * くさタイプの技を無効化し、その技を受けて無効化したときに攻撃を1段階上げる
 *
 * 既存の MotorDriveEffect（でんき無効 + 素早さ +1）と同パターン
 */
export class SapSipperEffect extends BaseTypeImmunityEffect {
  protected readonly immuneTypes = ['くさ'] as const;

  async onAfterTakingDamage(
    pokemon: BattlePokemonStatus,
    _originalDamage: number,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    if (!battleContext.moveTypeName) {
      return;
    }

    const isImmune = this.isImmuneToType(pokemon, battleContext.moveTypeName, battleContext);
    if (!isImmune) {
      return;
    }

    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(
      pokemon.id,
    );
    if (!currentStatus) {
      return;
    }

    const newAttackRank = Math.max(-6, Math.min(6, currentStatus.attackRank + 1));
    if (newAttackRank === currentStatus.attackRank) {
      return;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      attackRank: newAttackRank,
    });
  }
}
