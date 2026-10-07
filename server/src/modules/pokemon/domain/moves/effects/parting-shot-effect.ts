import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyStatChanges } from '../../battle-events/stat-change';
import { joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

/**
 * すてゼリフ（Parting Shot）技の効果
 *
 * 相手の攻撃と特攻を 1 段階ずつ下げてから、使用者が控えのポケモンと交代する（交代はエンジン。selfSwitch）。
 * 攻撃も特攻も下がらなかった（-6 だった・クリアボディなどで防がれた）ときは交代しない。
 * ミラーアーマーで跳ね返されたときは交代する（本家と同じ）
 */
export class PartingShotEffect implements IMoveEffect {
  readonly selfSwitch = true;

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const result = await applyStatChanges(
      defender,
      [
        { statType: 'attack', rankChange: -1 },
        { statType: 'specialAttack', rankChange: -1 },
      ],
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    if (result.applied.length === 0 && result.reflected.length === 0) {
      battleContext.selfSwitchCancelled = true;
    }
    return joinStatChangeMessages(result);
  }
}
