import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * テレキネシス（Telekinesis）技の効果
 * 相手を 3 ターンのあいだ浮かせる（本家の duration: 3。使ったターンを含む）
 *
 * - 浮いている間、相手への技は必ず当たり、じめん技は当たらない（エンジンが telekinesisTurns を見て行う）
 * - じゅうりょくの間は失敗する
 * - すでにテレキネシス状態の相手・ねをはるで根を張っている相手・ひんしの相手には失敗する
 * - ディグダ・ダグトリオ・スナバァ・シロデスナ（リージョンフォームを含む）には効かない（図鑑番号で判定する）
 *
 * 注: 第 8 世代以降は使えない技なので、第 7 世代までの動きにしている
 * 注: うちおとすで落とされた状態がないので、その相手にも失敗しない。メガゲンガーの判定もない
 */
export class TelekinesisEffect implements IMoveEffect {
  /** テレキネシスで浮かせるターン数 */
  private static readonly TURNS = 3;

  /** テレキネシスが効かないポケモンの図鑑番号（ディグダ・ダグトリオ・スナバァ・シロデスナ） */
  private static readonly IMMUNE_NATIONAL_DEX: readonly number[] = [50, 51, 769, 770];

  shouldFail(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return getGlobalFieldState(battleContext.battle.sideState).gravityTurns !== undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (defender.volatileState.ingrain === true) {
      return 'But it failed';
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      defender.trainedPokemonId,
    );
    const nationalDex = trainedPokemon?.pokemon.nationalDex;
    if (nationalDex !== undefined && TelekinesisEffect.IMMUNE_NATIONAL_DEX.includes(nationalDex)) {
      return 'But it failed';
    }
    const applied = await tryApplyVolatile(
      defender,
      'telekinesis',
      { telekinesisTurns: TelekinesisEffect.TURNS },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'was hurled into the air!' : 'But it failed';
  }
}
