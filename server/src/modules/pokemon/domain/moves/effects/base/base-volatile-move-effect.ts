import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { tryApplyVolatile, VolatileKind } from '../../../battle-events/volatile-infliction';
import { IMoveEffect } from '../../move-effect.interface';
import { moveEffectSource } from './base-stat-change-effect';

/**
 * 一時的な状態（volatileState）を 1 つ付与する変化技の基底クラス
 *
 * 付与できるか（ひんし・すでにその状態・性別・特性の canReceiveVolatile）は tryApplyVolatile が判定する。
 * 付与したら successMessage を、できなければ 'But it failed' を返す。
 * 付与したあとの効果（技の制限・必中・行動不能など）はエンジンが行う。
 */
export abstract class BaseVolatileMoveEffect implements IMoveEffect {
  /** 付与する状態の種類 */
  protected abstract readonly kind: VolatileKind;

  /** 状態を書くポケモン（'user' は使用者、'target' は相手） */
  protected abstract readonly appliesTo: 'user' | 'target';

  /** 付与したときのメッセージ */
  protected abstract readonly successMessage: string;

  /** 書き込む値（例: ロックオンは { lockOnTurns: 2 }） */
  protected abstract createPatch(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): StatePatch<VolatileState>;

  /**
   * 技ごとの失敗の条件（例: みやぶるは相手がミラクルアイを受けていれば失敗）
   * @returns 失敗するなら true
   */
  protected failsBeforeApply(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
  ): boolean {
    return false;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (this.failsBeforeApply(attacker, defender)) {
      return 'But it failed';
    }
    const target = this.appliesTo === 'user' ? attacker : defender;
    const applied = await tryApplyVolatile(
      target,
      this.kind,
      this.createPatch(attacker, defender, battleContext),
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? this.successMessage : 'But it failed';
  }
}
