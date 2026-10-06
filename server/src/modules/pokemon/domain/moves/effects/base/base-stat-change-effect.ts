import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { rollSecondaryEffect } from '../../secondary-effect';
import { EffectSource } from '../../../battle-events/effect-source';
import {
  StatChangeResult,
  applyStatChanges,
  formatStatChanges,
} from '../../../battle-events/stat-change';

/**
 * ステータスランクの種類
 */
export type StatType =
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'accuracy'
  | 'evasion';

/**
 * ステータスタイプからBattlePokemonStatusのプロパティ名へのマッピング
 * BaseStatChangeEffect、BaseSelfStatChangeMoveEffect、BaseOpponentStatChangeMoveEffectで共有
 */
export const STAT_RANK_PROP_MAP: Record<StatType, keyof BattlePokemonStatus> = {
  attack: 'attackRank',
  defense: 'defenseRank',
  specialAttack: 'specialAttackRank',
  specialDefense: 'specialDefenseRank',
  speed: 'speedRank',
  accuracy: 'accuracyRank',
  evasion: 'evasionRank',
};

/**
 * ステータスタイプから表示名へのマッピング（定義は battle-events/stat-change）
 * BaseStatChangeEffect、BaseSelfStatChangeMoveEffect、BaseOpponentStatChangeMoveEffectで共有
 */
export { STAT_NAME_MAP } from '../../../battle-events/stat-change';

/**
 * 相手のステータスランクを変更する技の基底クラス
 * 技が命中したとき（onHit）に相手のステータスランクを変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 * ランクは applyStatChanges で変える（相手の特性: あまのじゃく・クリアボディ・ミラーアーマーなどが効く）
 */
export abstract class BaseStatChangeEffect implements IMoveEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 変化確率（0.0-1.0、1.0の場合は必ず変化）
   */
  protected abstract readonly chance: number;

  /**
   * 技が命中したときに発動
   * 確率に基づいて相手のステータスランクを変更
   */
  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 確率判定（てんのめぐみ・りんぷんを考慮。chanceが1.0の場合は必ず変化）
    if (!rollSecondaryEffect(this.chance, battleContext)) {
      return null;
    }

    // 相手のランクを変える（相手の特性で変わる・防がれることがある）
    const result = await applyStatChanges(
      defender,
      [{ statType: this.statType, rankChange: this.rankChange }],
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return joinStatChangeMessages(result);
  }
}

/**
 * 技が起こした変化の原因（技名と使用者）を作る
 */
export const moveEffectSource = (
  attacker: BattlePokemonStatus,
  battleContext: BattleContext,
): EffectSource => ({
  pokemon: attacker,
  abilityName: battleContext.attackerAbilityName,
  kind: 'move',
  name: battleContext.moveName,
});

/**
 * 実際に変わった量からメッセージを作る（例: "Attack rose! Speed fell!"）
 * 変化のあとに反応した特性のメッセージを後ろに足す。何も変わらなければ null
 */
export const joinStatChangeMessages = (result: StatChangeResult): string | null => {
  const messages = [...formatStatChanges(result.applied), ...result.messages];
  return messages.length > 0 ? messages.join(' ') : null;
};
