import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * 2回当たらない技（Pokemon Showdown の noparentalbond フラグ）
 */
const NO_PARENTAL_BOND_MOVE_NAMES: ReadonlySet<string> = new Set([
  'だいばくはつ', // Explosion
  'じばく', // Self-Destruct
  'ミストバースト', // Misty Explosion
  'いのちがけ', // Final Gambit
  'がむしゃら', // Endeavor
  'なげつける', // Fling
  'ころがる', // Rollout
  'アイスボール', // Ice Ball
  'さわぐ', // Uproar
]);

/**
 * ためる技（charge フラグ）と時間差で当たる技（futuremove フラグ）
 */
const CHARGE_OR_FUTURE_MOVE_NAMES: ReadonlySet<string> = new Set([
  'ソーラービーム', // Solar Beam
  'ソーラーブレード', // Solar Blade
  'そらをとぶ', // Fly
  'あなをほる', // Dig
  'ダイビング', // Dive
  'とびはねる', // Bounce
  'ゴーストダイブ', // Phantom Force
  'シャドーダイブ', // Shadow Force
  'フリーフォール', // Sky Drop
  'ロケットずつき', // Skull Bash
  'ゴッドバード', // Sky Attack
  'かまいたち', // Razor Wind
  'フリーズボルト', // Freeze Shock
  'コールドフレア', // Ice Burn
  'メテオビーム', // Meteor Beam
  'エレクトロビーム', // Electro Shot
  'みらいよち', // Future Sight
  'はめつのねがい', // Doom Desire
]);

/**
 * おやこあい（Parental Bond）特性の効果
 * 連続技ではない攻撃技が2回当たる。2回目のダメージは0.25倍（1024/4096）
 *
 * 次の技は1回だけ当たる（Pokemon Showdown と同じ）:
 * - だいばくはつ・じばく・いのちがけ・がむしゃら・なげつける・ころがる など（noparentalbond）
 * - ためる技（ソーラービームなど）と、みらいよち・はめつのねがい
 *
 * 2回目の威力は1回目と同じで、基礎ダメージ（ダメージ式の +2 のあと）を0.25倍にする（本家と同じ）
 *
 * 注: 技の追加効果（onHit）は、2回当たっても1回だけ判定する（エンジンの近似）。せいでんきなどの接触時の特性は
 * ヒットごとの onDamagingHit で判定するので、2回判定する（本家と同じ）
 */
export class ParentalBondEffect implements IAbilityEffect {
  /**
   * 2回目のヒットの基礎ダメージの倍率
   */
  private static readonly SECOND_HIT_DAMAGE_RATIO = 0.25;

  getAdditionalHitDamageRatios(
    _pokemon: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): readonly number[] | undefined {
    const moveName = battleContext?.moveName;
    if (
      !moveName ||
      battleContext.moveCategory === 'Status' ||
      NO_PARENTAL_BOND_MOVE_NAMES.has(moveName) ||
      CHARGE_OR_FUTURE_MOVE_NAMES.has(moveName)
    ) {
      return undefined;
    }
    return [ParentalBondEffect.SECOND_HIT_DAMAGE_RATIO];
  }
}
