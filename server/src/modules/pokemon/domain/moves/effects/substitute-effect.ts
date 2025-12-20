import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「みがわり」の特殊効果実装
 *
 * 効果: 最大HPの1/4を消費してみがわりを作る
 * 注意: 現時点では、BattlePokemonStatusにsubstituteHpフィールドがないため、簡易実装としてHPを消費するのみ
 */
export class SubstituteEffect implements IMoveEffect {
  /**
   * みがわり作成に必要なHPの割合
   */
  private static readonly SUBSTITUTE_HP_RATIO = 0.25;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 最大HPの1/4を計算
    const substituteHp = Math.floor(attacker.maxHp * SubstituteEffect.SUBSTITUTE_HP_RATIO);

    // HPが不足している場合は何もしない
    if (attacker.currentHp <= substituteHp) {
      return null;
    }

    // HPを消費
    const newHp = attacker.currentHp - substituteHp;
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: newHp,
    });

    // TODO: BattlePokemonStatusにsubstituteHpフィールドを追加し、みがわりの状態を管理する必要がある
    return 'The user created a substitute!';
  }
}

