import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * パワートリック（Power Trick）技の効果
 *
 * 自分の攻撃と防御の実数値（ランク補正の前の値）を入れ替える。ランクは入れ替えない。
 * volatileState.statOverrides に書くので、交代で引っ込むと元に戻る。
 * もう一度使うと、今の攻撃と防御をまた入れ替えるので元に戻る（本家は状態を消して入れ替え直す。結果は同じ）。
 * ガードシェア・パワーシェアなどで上書きされた値も、上書きのあとの値どうしを入れ替える（本家と同じ）。
 *
 * 注: 本家はバトンタッチでパワートリックを引き継ぐが、ここでは引き継がない
 *     （エンジンのバトンタッチが statOverrides を引き継がないため）
 */
export class PowerTrickEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    // コンテキストの実数値は、statOverrides の上書きを反映した値
    const stats = battleContext.attackerStats;
    if (!battleContext.battleRepository || !stats) {
      return null;
    }

    await battleContext.battleRepository.patchVolatileState(attacker.id, {
      statOverrides: {
        ...attacker.volatileState.statOverrides,
        attack: stats.defense,
        defense: stats.attack,
      },
    });
    return 'switched its Attack and Defense!';
  }
}
