import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { TYPELESS_TYPE_NAME } from '@/modules/battle/domain/logic/effective-traits';
import { resolveTypeNames } from '@/modules/pokemon/domain/battle-events/battle-traits';
import { setTypes } from '@/modules/pokemon/domain/battle-events/type-change';

/**
 * リベロ（Libero）特性の効果
 * 技を出す直前（onPrepareHit）に、自分のタイプをその技のタイプ（タイプを変える効果のあと）だけにする。
 * 変化技・外れる技でも変わる。第 9 世代は場に出るたびに 1 回だけ（volatileState.typeChangeAbilityUsed）
 * - 次のときは変わらず、回数も使わない: タイプなしの技、今のタイプがすでに技のタイプだけ、タイプを変えられない
 *   （アルセウス・シルヴァディ。setTypes が false）
 * - はね返した技・みらいよちが当たるとき・よこどりで奪った技・技を呼ぶ技そのものでは、エンジンが呼ばない
 *
 * 注: まもる系の技（まもる・みきり・キングシールド・ニードルガード・トーチカ・ブロッキング・スレッドトラップ・
 *   かえんのまもり・こらえる）は、エンジンが成功の判定より前に onPrepareHit を呼ぶ。このため、続けて使ったり
 *   最後に動いたりして失敗しても、タイプが変わって 1 回分を使う（本家は技の失敗が先に決まり、変わらない）
 * 注: ため技（ソーラービーム・そらをとぶなど）は、ためるターンではなく攻撃するターンにタイプが変わる（本家は
 *   ためるターンに変わる）。ためている間はもとのタイプのまま攻撃を受け、攻撃するターンに動けなければ変わらない
 */
export class LiberoEffect implements IAbilityEffect {
  async onPrepareHit(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const typeName = battleContext?.moveTypeName;
    if (
      !battleContext ||
      !typeName ||
      typeName === TYPELESS_TYPE_NAME ||
      holder.volatileState.typeChangeAbilityUsed === true
    ) {
      return null;
    }
    const currentTypeNames = await resolveTypeNames(holder, battleContext);
    if (currentTypeNames.join() === typeName) {
      return null;
    }
    if (!(await setTypes(holder, [typeName], battleContext))) {
      return null;
    }
    await battleContext.battleRepository?.patchVolatileState(holder.id, {
      typeChangeAbilityUsed: true,
    });
    return `became the ${typeName} type!`;
  }
}
