import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * フィールド変更の基底クラス
 * 場に出すときにフィールドを変更する汎用的な実装
 *
 * 各特性は、このクラスを継承して変更するフィールドを設定するだけで実装できる
 */
export abstract class BaseFieldEffect implements IAbilityEffect {
  /**
   * 変更するフィールド
   */
  protected abstract readonly field: Field;

  /**
   * 場に出すときに発動
   * フィールドを変更
   */
  async onEntry(_pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext?.battleRepository) {
      return;
    }

    const battle = battleContext.battle;

    // 既に同じフィールドの場合は変更しない
    if (battle.field === this.field) {
      return;
    }

    // フィールドを変更
    await battleContext.battleRepository.update(battle.id, {
      field: this.field,
    });
  }
}
