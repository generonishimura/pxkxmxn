import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move } from '../../entities/move.entity';
import { StatChange, applyStatChanges } from '../../battle-events/stat-change';
import {
  STAT_RANK_PROP_MAP,
  StatType,
  joinStatChangeMessages,
  moveEffectSource,
} from './base/base-stat-change-effect';

const STAT_TYPES: readonly StatType[] = [
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
  'accuracy',
  'evasion',
];

/**
 * シャドースチール（Spectral Thief）技の効果
 * ダメージを与える前に、相手のプラスのランクをすべて奪って自分のランクに足す
 *
 * - 相手のプラスのランクは0になる。マイナスのランクはそのまま
 * - 奪ったあとのランクでダメージを計算する（beforeDamage のあとにエンジンが状態を取り直す）
 * - 技が相手に効かない（ノーマルタイプなど、タイプ相性が0）ときは奪わない（本家と同じ）
 * - 自分のランクの上昇は applyStatChanges で行う（たんじゅん・あまのじゃくが効く。+6 まで）
 * - メッセージは beforeDamage では返せないため、同じ技の実行の onHit で返す
 * 注: 相手がびんじょうなら、本家は技のあとに上昇を写すが、ここではダメージの前に写す
 */
export class SpectralThiefEffect implements IMoveEffect {
  /**
   * beforeDamage で作ったメッセージを、同じ技の実行（同じコンテキスト）の onHit に渡す
   */
  private readonly pendingMessages = new WeakMap<BattleContext, string>();

  async beforeDamage(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _move: Move,
    battleContext: BattleContext,
  ): Promise<void> {
    if (!battleContext.battleRepository || battleContext.moveTypeEffectiveness === 0) {
      return;
    }

    const stolen: StatChange[] = STAT_TYPES.map(statType => ({
      statType,
      rankChange: Number(defender[STAT_RANK_PROP_MAP[statType]]),
    })).filter(change => change.rankChange > 0);
    if (stolen.length === 0) {
      return;
    }

    // 相手のプラスのランクを0にする（奪う効果は能力の低下ではないため、直接書き込む）
    await battleContext.battleRepository.updateBattlePokemonStatus(
      defender.id,
      Object.fromEntries(stolen.map(change => [STAT_RANK_PROP_MAP[change.statType], 0])),
    );

    const result = await applyStatChanges(attacker, stolen, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    const statMessage = joinStatChangeMessages(result);
    this.pendingMessages.set(
      battleContext,
      ["Stole the target's stat boosts!", statMessage].filter(Boolean).join(' '),
    );
  }

  async onHit(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const message = this.pendingMessages.get(battleContext) ?? null;
    this.pendingMessages.delete(battleContext);
    return message;
  }
}
