import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

/**
 * じゅうりょくの残りターン数（本家の pseudoWeather の duration）
 */
const GRAVITY_TURNS = 5;

/**
 * 場のポケモンを地面に落とすために消すキー（浮いている状態と、そらをとぶ・とびはねるで空にいる状態）
 */
const groundingPatch = (state: VolatileState): StatePatch<VolatileState> | undefined => {
  const patch: StatePatch<VolatileState> = {
    ...(state.magnetRiseTurns !== undefined ? { magnetRiseTurns: null } : {}),
    ...(state.telekinesisTurns !== undefined ? { telekinesisTurns: null } : {}),
    ...(state.semiInvulnerable === 'air' ? { semiInvulnerable: null, chargingMoveId: null } : {}),
  };
  return Object.keys(patch).length > 0 ? patch : undefined;
};

/**
 * じゅうりょく（Gravity）技の効果
 *
 * 5 ターンの間、命中率が 6840/4096 倍になり、ひこうタイプ・ふゆうのポケモンにもじめん技が当たり、
 * そらをとぶ・とびはねるなど空を使う技を出せなくなる（効果と終わりはエンジンが行う）。
 * 張ったときに、場のポケモンのでんじふゆう・テレキネシスと、そらをとぶ・とびはねるで空にいる状態を消す。
 * すでにじゅうりょくなら失敗する
 * 注: 本家は空にいるポケモンのそのターンの技を取り消すが、ここではため技の状態を消すだけなので、
 * そのポケモンはそのターンに、じゅうりょくで技を出せずに止まる
 */
export class GravityEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    if (getGlobalFieldState(battle.sideState).gravityTurns !== undefined) {
      return 'But it failed';
    }
    await repository.patchGlobalFieldState(battle.id, { gravityTurns: GRAVITY_TURNS });
    const statuses = await repository.findBattlePokemonStatusByBattleId(battle.id);
    for (const status of statuses) {
      const patch = status.isActive ? groundingPatch(status.volatileState) : undefined;
      if (patch) {
        await repository.patchVolatileState(status.id, patch);
      }
    }
    return 'Gravity intensified!';
  }
}
