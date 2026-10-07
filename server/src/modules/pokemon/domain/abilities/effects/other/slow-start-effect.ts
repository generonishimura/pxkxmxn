import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { BattleContext } from '../../battle-context.interface';

const SLOW_START_ABILITY_NAME = 'スロースタート';

/**
 * スロースタート（Slow Start）特性の効果
 * 場に出てから 5 ターンの間、攻撃と素早さが半分になる
 *
 * - 効いている間: battle.turn - switchedInTurn <= 5（先発は 1〜5 ターン目、ターン N に交代で出たら N〜N+5 ターン目。
 *   本家の counter 5 は、場に出たターンの終わりには減らない）
 * - 素早さ: 半分（切り捨て。本家の chainModify(0.5) と同じ）
 * - 攻撃: 物理技のダメージを半分にする。ボディプレスは防御で計算するので変えない
 * - 場に出たターン（volatileState.switchedInTurn）が分からなければ、効かない
 * - 場に出たあとで得たとき（スキルスワップ・なりきりなど。場に出たターンより後）は、得たターン（slowStartTurn）から数え、
 *   battle.turn - slowStartTurn <= 4 の間効く（本家は得たターンの終わりから counter を減らす）
 *
 * 注: 攻撃の実数値ではなくダメージを半分にするので、まれに本家と 1 違う
 * 注: ひんしのあとに出したポケモンは、次のターンの行動で場に出る（本家はターン終了時に出る）ので、本家より 1 ターン長く効く
 * 注: 場に出たときと、効果が終わったときのメッセージは出さない
 */
export class SlowStartEffect implements IAbilityEffect {
  /** 効いているターン数（場に出たターンを除く） */
  private static readonly DURATION = 5;
  /** 半分（4096 分率） */
  private static readonly HALF = 2048;
  /** 攻撃ではなく防御で計算する物理技 */
  private static readonly DEFENSE_BASED_MOVES: readonly string[] = ['ボディプレス'];

  /**
   * 場に出たあとでスロースタートを得たら、得たターンを書く（本家の onStart で counter を 5 にするのと同じ）
   * 場に出たとき・場に出たターンに得たとき（トレースなど）は、場に出たターンで数えるので書かない
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const turn = battleContext?.battle?.turn;
    const switchedInTurn = pokemon.volatileState.switchedInTurn;
    if (
      !battleContext?.battleRepository ||
      turn === undefined ||
      pokemon.volatileState.abilityOverride !== SLOW_START_ABILITY_NAME ||
      switchedInTurn === undefined ||
      switchedInTurn >= turn
    ) {
      return;
    }
    await battleContext.battleRepository.patchVolatileState(pokemon.id, { slowStartTurn: turn });
  }

  modifySpeed(
    pokemon: BattlePokemonStatus,
    speed: number,
    battleContext?: BattleContext,
  ): number | undefined {
    return SlowStartEffect.isActive(pokemon, battleContext) ? Math.floor(speed / 2) : undefined;
  }

  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      battleContext?.moveCategory !== 'Physical' ||
      (battleContext.moveName !== undefined &&
        SlowStartEffect.DEFENSE_BASED_MOVES.includes(battleContext.moveName)) ||
      !SlowStartEffect.isActive(pokemon, battleContext)
    ) {
      return undefined;
    }
    return modifyByFixedPoint(damage, SlowStartEffect.HALF);
  }

  /**
   * スロースタートが効いているか（場に出てから 5 ターンの間か）
   */
  private static isActive(pokemon: BattlePokemonStatus, battleContext?: BattleContext): boolean {
    const { switchedInTurn, slowStartTurn } = pokemon.volatileState;
    if (!battleContext?.battle || switchedInTurn === undefined) {
      return false;
    }
    if (slowStartTurn !== undefined) {
      return battleContext.battle.turn - slowStartTurn < SlowStartEffect.DURATION;
    }
    return battleContext.battle.turn - switchedInTurn <= SlowStartEffect.DURATION;
  }
}
