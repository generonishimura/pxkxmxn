import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { swapSideConditions } from '../../battle-events/field-state';
import { COURT_CHANGE_KEYS, getSideConditions } from '@/modules/battle/domain/state/side-state';

/**
 * コートチェンジ（Court Change）技の効果
 *
 * 自分の陣営と相手の陣営の、壁・おいかぜ・しんぴのまもり・しろいきり・おまじない・設置技を、
 * 残りターン数や層の数ごと入れ替える（COURT_CHANGE_KEYS）。ねがいごと・いやしのねがいは入れ替えない。
 * どちらの陣営にも入れ替える状態がなければ失敗する（本家と同じ）
 */
export class CourtChangeEffect implements IMoveEffect {
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
    const hasSwappable = [battle.trainer1Id, battle.trainer2Id].some(trainerId => {
      const side = getSideConditions(battle.sideState, trainerId);
      return COURT_CHANGE_KEYS.some(key => side[key] !== undefined);
    });
    if (!hasSwappable) {
      return 'But it failed';
    }
    await swapSideConditions(battleContext);
    return 'The user swapped the battle effects affecting each side of the field!';
  }
}
