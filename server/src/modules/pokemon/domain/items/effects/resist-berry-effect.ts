import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { berryEffectMultiplier, eatItem } from '../../battle-events/eat-item';

/**
 * 決まったタイプの技のダメージを、1 回だけ半分にするきのみ
 * - 効果抜群の技だけを半分にするきのみ（オッカのみ・イトケのみ など 17 種類）
 * - ノーマルの技を、相性にかかわらず半分にするきのみ（ホズのみ）
 *
 * 防御側の持ち物の modifyDamage で、食べてからダメージを半分にする（本家の onSourceModifyDamage と同じ）。
 * 本家と同じく、次のときは食べない
 * - みがわりに当たる技（音技・すりぬけなど、みがわりを無視する技なら食べる）
 * - 技が効かない（タイプ相性が 0）
 * - 食べられない（リポジトリがなく持ち物を消せない、相手のきんちょうかん。eatItem が見る）
 * 連続技では最初のヒットで食べるので、半分になるのは最初のヒットだけ
 * じゅくせい（berryEffectMultiplier）なら 1/4 にする（本家の ripen の onSourceModifyDamage）
 *
 * 注: 食べたことはメッセージに出していない（modifyDamage はダメージだけを返す。ほおぶくろの回復のメッセージも出ない）
 * 注: 本家の 4096 分率の補正（2048/4096）ではなく、ほかの特性の補正と同じく 0.5 倍を掛ける
 */
export class ResistBerryEffect implements IItemEffect {
  private static readonly DAMAGE_MULTIPLIER = 0.5;

  /**
   * @param resistedTypeName 半分にする技のタイプ（日本語名）
   * @param requiresSuperEffective 効果抜群のときだけ半分にするか（ホズのみは false）
   */
  constructor(
    private readonly resistedTypeName: string,
    private readonly requiresSuperEffective: boolean,
  ) {}

  async modifyDamage(
    holder: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): Promise<number | undefined> {
    if (!battleContext || battleContext.moveTypeName !== this.resistedTypeName) {
      return undefined;
    }
    const effectiveness = battleContext.typeEffectiveness ?? 1;
    if (effectiveness === 0 || (this.requiresSuperEffective && effectiveness <= 1)) {
      return undefined;
    }
    const hitsSubstitute =
      holder.volatileState.substituteHp !== undefined && battleContext.bypassesSubstitute !== true;
    if (hitsSubstitute) {
      return undefined;
    }
    if (!(await eatItem(holder, battleContext))) {
      return undefined;
    }
    const multiplier = await berryEffectMultiplier(holder, battleContext);
    return (damage * ResistBerryEffect.DAMAGE_MULTIPLIER) / multiplier;
  }

  /**
   * 食べたときの効果はない（ダメージを半分にするのは modifyDamage。本家の onEat も何もしない）
   */
  onEat(): Promise<string | null> {
    return Promise.resolve(null);
  }
}
