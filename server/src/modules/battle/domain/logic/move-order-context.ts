import { Battle } from '../entities/battle.entity';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Move } from '@/modules/pokemon/domain/entities/move.entity';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  BattleContext,
  BattleStatValues,
} from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveFlags } from '@/modules/pokemon/domain/moves/move-flags';
import { resolveEffectiveWeather } from './effective-weather';
import { StatCalculator } from './stat-calculator';

/**
 * 行動順の判定用コンテキストの入力
 */
export interface MoveOrderContextParams {
  battle: Battle;
  /** 行動するポケモンが選んだ技 */
  move: Move;
  /** 行動するポケモン */
  pokemon: BattlePokemonStatus;
  /** 行動するポケモンの特性名 */
  abilityName?: string;
  /** 相手のポケモンの特性名 */
  opponentAbilityName?: string;
  /** 行動するポケモンのランク補正前の実数値 */
  stats?: BattleStatValues;
}

/**
 * modifyPriority / modifySpeed に渡すコンテキストを作成する
 *
 * 行動するポケモン自身を attacker / attackerStats / attackerAbilityName に入れ、
 * 相手の特性を defenderAbilityName に入れる。天候は場の特性を考慮した「効果のある天候」にする。
 * 注: 技のタイプは技本来のタイプ（うるおいボイスなどのタイプ変更は反映しない）
 */
export const createMoveOrderContext = (params: MoveOrderContextParams): BattleContext => ({
  battle: params.battle,
  weather: resolveEffectiveWeather(params.battle.weather, [
    params.abilityName,
    params.opponentAbilityName,
  ]),
  field: params.battle.field,
  moveName: params.move.name,
  moveTypeName: params.move.type.name,
  moveCategory: params.move.category,
  movePriority: params.move.priority,
  moveFlags: MoveFlags.get(params.move.name),
  attackerAbilityName: params.abilityName,
  defenderAbilityName: params.opponentAbilityName,
  attacker: params.pokemon,
  attackerStats: params.stats,
});

/**
 * 育成ポケモンからランク補正前の実数値を計算する
 */
export const calculateBattleStats = (trainedPokemon: TrainedPokemon): BattleStatValues => {
  const stats = StatCalculator.calculate({
    baseHp: trainedPokemon.pokemon.baseHp,
    baseAttack: trainedPokemon.pokemon.baseAttack,
    baseDefense: trainedPokemon.pokemon.baseDefense,
    baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
    baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
    baseSpeed: trainedPokemon.pokemon.baseSpeed,
    level: trainedPokemon.level,
    ivHp: trainedPokemon.ivHp,
    ivAttack: trainedPokemon.ivAttack,
    ivDefense: trainedPokemon.ivDefense,
    ivSpecialAttack: trainedPokemon.ivSpecialAttack,
    ivSpecialDefense: trainedPokemon.ivSpecialDefense,
    ivSpeed: trainedPokemon.ivSpeed,
    evHp: trainedPokemon.evHp,
    evAttack: trainedPokemon.evAttack,
    evDefense: trainedPokemon.evDefense,
    evSpecialAttack: trainedPokemon.evSpecialAttack,
    evSpecialDefense: trainedPokemon.evSpecialDefense,
    evSpeed: trainedPokemon.evSpeed,
    nature: trainedPokemon.nature,
  });
  return {
    attack: stats.attack,
    defense: stats.defense,
    specialAttack: stats.specialAttack,
    specialDefense: stats.specialDefense,
    speed: stats.speed,
  };
};
