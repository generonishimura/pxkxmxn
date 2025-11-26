import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * 反動ダメージの基底クラス
 * 技を使用した後に、使用者自身に反動ダメージを与える汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承して反動率を設定するだけで実装できる
 */
export abstract class BaseRecoilEffect implements IMoveEffect {
  /**
   * 反動率（0.0-1.0、例: 0.33は与えたダメージの1/3）
   */
  protected abstract readonly recoilRatio: number;

  /**
   * 反動ダメージ適用時のメッセージ
   */
  protected abstract readonly message: string;

  /**
   * ダメージ適用後に発動
   * 与えたダメージに基づいて反動ダメージを計算し、使用者自身にダメージを与える
   */
  async afterDamage(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    damage: number,
    battleContext: BattleContext,
  ): Promise<string | null> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext.battleRepository) {
      return null;
    }

    // 与えたダメージが0の場合は反動ダメージを発生させない
    if (damage <= 0) {
      return null;
    }

    // 反動ダメージを計算（与えたダメージ × 反動率）
    const recoilDamage = Math.floor(damage * this.recoilRatio);

    // 反動ダメージが0の場合は処理しない
    if (recoilDamage <= 0) {
      return null;
    }

    // 現在のHPを取得（最新の状態を取得するため）
    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(
      attacker.id,
    );
    if (!currentStatus) {
      return null;
    }

    // 反動ダメージを適用（HPが0未満にならないように制限）
    const newHp = Math.max(0, currentStatus.currentHp - recoilDamage);

    // HPを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: newHp,
    });

    // メッセージを返す（反動ダメージの値を含める）
    // メッセージに{damage}が含まれている場合は置換、含まれていない場合はそのまま返す
    if (this.message.includes('{damage}')) {
      return this.message.replace('{damage}', recoilDamage.toString());
    }
    return `${this.message} (${recoilDamage} damage)`;
  }
}

