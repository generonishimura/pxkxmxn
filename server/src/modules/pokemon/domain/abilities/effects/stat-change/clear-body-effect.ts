import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * クリアボディ（Clear Body）特性の効果
 * 自分の能力ランクが下がらない
 *
 * 注意: 既存の `BigPecksEffect`（はとむね）と同じく、現状はマーカー扱い。
 *       実際の無効化処理は、能力ランクを下げる側（`BaseOpponentStatChangeMoveEffect` 等）で
 *       本特性を参照して gating する必要がある（engine 拡張余地）。
 *       将来的に `canReceiveStatChange` フックを追加してロジック実装に置き換える想定。
 */
export class ClearBodyEffect implements IAbilityEffect {
  passiveEffect?(_pokemon: BattlePokemonStatus, _battleContext?: BattleContext): void {
    // マーカー特性。実際の無効化処理は能力ランク変更側で gating される想定。
  }
}
