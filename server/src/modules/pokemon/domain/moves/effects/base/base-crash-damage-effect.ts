import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { applyMaxHpSelfDamage } from './apply-max-hp-self-damage';

/**
 * 外したときに使用者が自傷ダメージを受ける技の基底クラス
 * 技が外れたとき（onMiss）に、使用者の最大HPの半分（切り捨て、最低1）のダメージを与える
 *
 * 第5世代以降の仕様（最大HPの1/2）に合わせている
 *
 * 注: エンジンは命中判定で外れたときだけ onMiss を呼ぶため、タイプ相性で無効化
 *     （ゴーストタイプ相手など）されたときの自傷は発生しない
 */
export abstract class BaseCrashDamageEffect implements IMoveEffect {
  /**
   * 自傷ダメージ適用時のメッセージ
   */
  protected readonly message: string = 'kept going and crashed!';

  /**
   * 技が外れたときに発動
   * 使用者自身に最大HPの半分のダメージを与える
   */
  async onMiss(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const crashDamage = await applyMaxHpSelfDamage(attacker.id, 2, battleContext);
    if (crashDamage === null) {
      return null;
    }

    return `${this.message} (${crashDamage} damage)`;
  }
}
