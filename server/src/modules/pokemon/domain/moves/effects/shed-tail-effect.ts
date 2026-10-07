import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * しっぽきり（Shed Tail）技の効果
 *
 * 最大 HP の半分（切り上げ）を払って、最大 HP の 1/4（切り捨て）のみがわりを作り、控えと交代する。
 * みがわりは交代で出てきたポケモンが引き継ぐ（selfSwitch: 'shedTail'。引き継ぎと交代はエンジン）。
 * 控えがいない・すでにみがわりがある・HP が最大 HP の半分（切り上げ）以下なら失敗する（交代もしない）。
 * HP を払うのは技以外のダメージではないので、マジックガードでも払う（本家の directDamage）
 */
export class ShedTailEffect implements IMoveEffect {
  readonly selfSwitch = 'shedTail';

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const cost = Math.ceil(attacker.maxHp / 2);
    if (
      !(await hasSwitchTarget(battleContext, attacker.trainerId)) ||
      attacker.volatileState.substituteHp !== undefined ||
      attacker.currentHp <= cost
    ) {
      return 'But it failed';
    }

    await repository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - cost,
    });
    await repository.patchVolatileState(attacker.id, {
      substituteHp: Math.floor(attacker.maxHp / 4),
    });
    return 'The user shed its tail to create a decoy!';
  }
}
