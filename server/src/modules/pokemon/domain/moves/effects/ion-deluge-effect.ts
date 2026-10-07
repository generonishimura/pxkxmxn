import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';

/**
 * プラズマシャワー（Ion Deluge）技の効果
 *
 * このターンだけ、場のノーマルタイプの技（変化技も）をでんきタイプにする（GlobalFieldState.ionDeluge）。
 * タイプを変えるのと、ターン終了時に消すのはエンジンが行う。
 * このターンにすでにプラズマシャワーが使われていれば失敗する（本家の addPseudoWeather は、重ねて張れない）。
 */
export class IonDelugeEffect implements IMoveEffect {
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
    if (getGlobalFieldState(battle.sideState).ionDeluge === true) {
      return 'But it failed';
    }
    await repository.patchGlobalFieldState(battle.id, { ionDeluge: true });
    return 'A deluge of ions showers the battlefield!';
  }
}
