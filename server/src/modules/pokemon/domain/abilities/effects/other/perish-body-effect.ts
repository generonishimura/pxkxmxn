import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { EffectSource } from '../../../battle-events/effect-source';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';

/**
 * ほろびのうたと同じカウント（使ったターンを含めて 4 回目のターン終了時にひんし）
 */
const PERISH_COUNT = 3;

const ABILITY_NAME = 'ほろびのボディ';

/**
 * ほろびのボディ（Perish Body）特性の効果
 *
 * 接触技でダメージを受けたヒットごとに、自分と攻撃側の両方に、ほろびのうたのカウント
 * （volatileState.perishCount）を 3 書く。ひんしにするのはエンジン。
 * - 攻撃側がすでにカウントを持っていれば何もしない（自分にも付けない。本家と同じ）
 * - 自分がすでにカウントを持っていれば、攻撃側にだけ付ける（自分のカウントは変えない）
 * - このヒットで自分がひんしになっても、攻撃側には付ける
 * - 接触したかは hit.isContact（えんかくなどで接触しなくなった技は false）で判定する
 */
export class PerishBodyEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext?.battleRepository || !hit.isContact) {
      return null;
    }
    if (attacker.volatileState.perishCount !== undefined) {
      return null;
    }

    const source: EffectSource = { pokemon: holder, kind: 'ability', name: ABILITY_NAME };
    const patch = { perishCount: PERISH_COUNT };
    const attackerApplied = await tryApplyVolatile(attacker, 'perishSong', patch, battleContext, {
      source,
    });
    const holderApplied = await tryApplyVolatile(holder, 'perishSong', patch, battleContext, {
      source,
    });
    return attackerApplied || holderApplied ? `${ABILITY_NAME} activated!` : null;
  }
}
