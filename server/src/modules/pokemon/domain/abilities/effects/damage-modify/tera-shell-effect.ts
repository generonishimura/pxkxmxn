import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * テラスシェル（Tera Shell）特性の効果
 *
 * HPが満タンのとき、受ける攻撃技のタイプ相性をすべて「効果いまひとつ」（0.5倍）にする。
 * 効果ばつぐん・等倍だけでなく、1/4の技も0.5倍になる（本家と同じ）。
 *
 * - 効果がない技（相性0）はそのまま
 * - わるあがきには発動しない
 * - かたやぶりで無視される（エンジンが防御側の modifyDamage を呼ばない）
 * - ダメージ計算の中の相性の倍率を差し替えるので、丸めはタイプ相性が0.5倍のときと同じになる
 *
 * 注: 本家は連続技の1回目で発動すると、2回目以降も0.5倍のまま。ここではヒットごとにHPが満タンかを見るため、
 *     2回目以降はもとの相性に戻る。直すには、技を受ける前の HP を BattleContext に入れる必要がある
 *     （docs/battle-engine-hooks.md の7章）
 * 注: 攻撃側のいろめがね・ブレインフォースは、変える前の相性で判定される
 * 注: 発動したときのメッセージは出ない。modifyDamage はメッセージを返せないため
 */
export class TeraShellEffect implements IAbilityEffect {
  /**
   * 発動したときのタイプ相性
   */
  private static readonly RESISTED_EFFECTIVENESS = 0.5;

  /**
   * 発動しない技
   */
  private static readonly IGNORED_MOVE_NAMES: ReadonlySet<string> = new Set(['わるあがき']);

  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    const effectiveness = battleContext?.typeEffectiveness;
    if (
      effectiveness === undefined ||
      effectiveness <= 0 ||
      pokemon.currentHp < pokemon.maxHp ||
      TeraShellEffect.IGNORED_MOVE_NAMES.has(battleContext?.moveName ?? '')
    ) {
      return damage;
    }
    return (damage * TeraShellEffect.RESISTED_EFFECTIVENESS) / effectiveness;
  }
}
