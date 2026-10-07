import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「みがわり」の特殊効果実装
 *
 * 最大 HP の 1/4（切り捨て）を払って、同じ HP のみがわり（`volatileState.substituteHp`）を作る。
 * みがわりがダメージを受ける・相手の変化技を防ぐ処理はエンジンが行う（`docs/battle-state.md`）。
 * すでにみがわりがある・HP が最大 HP の 1/4 以下・最大 HP が 1 なら失敗する（本家と同じ）。
 * HP を払うのは技以外のダメージではないので、マジックガードでも払う（本家の directDamage）
 */
export class SubstituteEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    if (
      attacker.volatileState.substituteHp !== undefined ||
      attacker.currentHp <= attacker.maxHp / 4 ||
      attacker.maxHp === 1
    ) {
      return 'But it failed';
    }

    const substituteHp = Math.floor(attacker.maxHp / 4);
    await repository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - substituteHp,
    });
    await repository.patchVolatileState(attacker.id, { substituteHp });
    return 'The user created a substitute!';
  }
}
