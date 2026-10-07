import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { getContextWeather } from '../../abilities/context-weather';
import { BaseSideConditionMoveEffect } from './base/base-side-condition-move-effect';

/**
 * オーロラベール（Aurora Veil）技の効果
 *
 * 5 ターンの間、自分の陣営のポケモンが受ける物理技・特殊技のダメージを半分にする（急所・すりぬけでは効かない）。
 * ダメージの補正と残りターン数の管理はエンジン（DamageCalculator・ターン終了時の処理）が行う。
 * 効果のある天候があられ（ゆき）でなければ失敗する（ノーてんき・エアロックが場にいても失敗する）。すでに張っていれば失敗する
 * 注: ゆきの天候がないため、あられのときに使えるようにしている
 */
export class AuroraVeilEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'auroraVeilTurns';
  protected readonly turns = 5;
  protected readonly message =
    'Aurora Veil made your team stronger against physical and special moves!';

  shouldFail(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return getContextWeather(battleContext) !== Weather.Hail;
  }
}
