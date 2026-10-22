import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { hasSwitchTarget } from '../../battle-events/switching';

/**
 * バトンタッチ（Baton Pass）技の効果
 *
 * 使用者が控えのポケモンと交代し、能力ランクと一部の一時的な状態（みがわり・こんらん・やどりぎのタネなど。
 * エンジンの BATON_PASS_KEYS）を次のポケモンに引き継ぐ。
 * 控え（ひんしでないポケモン）がいなければ失敗する。交代と引き継ぎはエンジンが行う（selfSwitch: 'batonPass'）
 */
export class BatonPassEffect implements IMoveEffect {
  readonly selfSwitch = 'batonPass';

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return (await hasSwitchTarget(battleContext, attacker.trainerId)) ? null : 'But it failed';
  }
}
