import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveAbilityName } from '../../battle-events/ability-lookup';
import { applyStatChanges } from '../../battle-events/stat-change';
import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';
import { joinStatChangeMessages } from './base/base-stat-change-effect';

/**
 * おいかぜ（Tailwind）技の効果
 *
 * 4 ターン（使ったターンを含む）の間、自分の陣営のポケモンの素早さを 2 倍にする。
 * 素早さの補正と残りターン数の管理はエンジン（行動順の決定・ターン終了時の処理）が行う。すでに吹いていれば失敗する
 *
 * - 吹かせた使い手の特性が かぜのり なら、攻撃を 1 段階上げる（本家の かぜのり の onSideConditionStart）。
 *   おいかぜが吹いたときに呼ばれる特性のフックがないので、この技の中で行う。失敗したときは上げない
 * - 特性が いえき で消されていれば上げない
 * 注: 本家ではダブルバトルで味方の かぜのり も上がるが、シングルバトルなので使い手だけを見る
 */
export class TailwindEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'tailwindTurns';
  protected readonly turns = 4;
  protected readonly message = 'The Tailwind blew from behind your team!';

  private static readonly WIND_RIDER_ABILITY_NAME = 'かぜのり';

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const message = await super.onUse(attacker, defender, battleContext);
    if (message !== this.message || attacker.volatileState.abilitySuppressed === true) {
      return message;
    }
    const abilityName = await resolveAbilityName(attacker, battleContext);
    if (abilityName !== TailwindEffect.WIND_RIDER_ABILITY_NAME) {
      return message;
    }
    const result = await applyStatChanges(
      attacker,
      [{ statType: 'attack', rankChange: 1 }],
      battleContext,
      { source: { pokemon: attacker, kind: 'ability', name: abilityName } },
    );
    const statMessage = joinStatChangeMessages(result);
    return statMessage ? `${message} ${statMessage}` : message;
  }
}
