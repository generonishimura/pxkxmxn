import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { getSideConditions } from '../../domain/state/side-state';
import { MegaEvolution } from '../../domain/logic/mega-evolutions';
import {
  MEGA_EVOLUTION_PROBLEM_MESSAGES,
  resolveMegaEvolution,
} from '../../domain/logic/mega-evolution-rule';
import { changeForm } from '@/modules/pokemon/domain/battle-events/form-change';
import { startAbility } from '@/modules/pokemon/domain/battle-events/ability-change';
import { NotFoundException, ValidationException } from '@/shared/domain/exceptions';

/**
 * メガシンカを選んだトレーナーの行動
 */
export interface MegaEvolutionRequest {
  readonly trainerId: number;
  readonly switchPokemonId?: number;
  readonly megaEvolve?: boolean;
}

/**
 * MegaEvolutionService
 * メガシンカ（Issue #261）。リクエストを確かめることと、メガシンカさせることを受け持つ
 * いつメガシンカするか（交代のあと、技の前）は ExecuteTurnUseCase が決める
 */
@Injectable()
export class MegaEvolutionService {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * リクエストのメガシンカを確かめる（何も書き込まない）
   * 次のときは ValidationException を投げる: 交代といっしょに選んだ・メガストーンを持っていない・
   * すでにメガシンカした姿・トレーナーがこのバトルですでにメガシンカした
   * @param active メガシンカする場のポケモン
   * @returns メガシンカした姿。メガシンカを選んでいなければ undefined
   */
  async findValidMegaEvolution(
    battle: Battle,
    request: MegaEvolutionRequest,
    active: BattlePokemonStatus,
  ): Promise<MegaEvolution | undefined> {
    if (!request.megaEvolve) {
      return undefined;
    }
    if (request.switchPokemonId) {
      throw new ValidationException(
        `Mega Evolution must be chosen together with a move (trainerId: ${request.trainerId})`,
        'megaEvolve',
      );
    }
    const trainedPokemon = await this.trainedPokemonRepository.findById(active.trainedPokemonId);
    if (!trainedPokemon) {
      throw new NotFoundException('TrainedPokemon', active.trainedPokemonId);
    }
    const resolved = resolveMegaEvolution(
      trainedPokemon.pokemon.nationalDex,
      active,
      getSideConditions(battle.sideState, request.trainerId),
    );
    if ('problem' in resolved) {
      throw new ValidationException(
        `${MEGA_EVOLUTION_PROBLEM_MESSAGES[resolved.problem]} (battlePokemonStatusId: ${active.id}, trainerId: ${request.trainerId})`,
        'megaEvolve',
      );
    }
    return resolved.mega;
  }

  /**
   * メガシンカさせる（本家の runMegaEvo）
   * 1. 交代しても残るフォルム（persistentState.form）を、メガシンカした姿にする。タイプ・種族値・特性は表の値になる
   * 2. トレーナーの陣営に、このバトルでメガシンカした記録（megaEvolved）を書く
   * 3. メガシンカした姿の特性の onEntry を呼ぶ（本家は永続の formeChange で setAbility し、特性の Start が動く。いかく・ひでりなど）
   * @returns 結果のメッセージ。ひんし・へんしん中でフォルムを変えられなければ、何も書かずに undefined
   */
  async megaEvolve(
    battle: Battle,
    pokemon: BattlePokemonStatus,
    mega: MegaEvolution,
  ): Promise<string | undefined> {
    const context = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    };
    if (!(await changeForm(pokemon, mega.form, context, { persistent: true }))) {
      return undefined;
    }
    await this.battleRepository.patchSideConditions(battle.id, pokemon.trainerId, {
      megaEvolved: true,
    });
    // 書いた陣営の状態とフォルムが見えるよう、読み直したバトルを渡す
    await startAbility(pokemon.id, mega.abilityName, {
      ...context,
      battle: (await this.battleRepository.findById(battle.id)) ?? battle,
    });
    return `Pokemon (ID: ${pokemon.trainedPokemonId}) has Mega Evolved! (form: ${mega.form})`;
  }
}
