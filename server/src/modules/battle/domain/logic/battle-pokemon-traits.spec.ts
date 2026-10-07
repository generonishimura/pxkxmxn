import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { VolatileState } from '../state/volatile-state';
import { PersistentPokemonState } from '../state/persistent-state';
import { Nature } from './stat-calculator';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import {
  battleAbilityNameOf,
  battleMaxHpOf,
  battleStatsOf,
  battleTypeNamesOf,
} from './battle-pokemon-traits';

const trained = (params: {
  nationalDex?: number;
  types?: [string, string?];
  ability?: string;
  base?: [number, number, number, number, number, number];
}): TrainedPokemon => {
  const [primary, secondary] = params.types ?? ['ノーマル'];
  const [hp, atk, def, spa, spd, spe] = params.base ?? [100, 100, 100, 100, 100, 100];
  return new TrainedPokemon(
    1,
    1,
    new Pokemon(
      1,
      params.nationalDex ?? 1,
      'テスト',
      'Test',
      new Type(1, primary, primary),
      secondary ? new Type(2, secondary, secondary) : null,
      hp,
      atk,
      def,
      spa,
      spd,
      spe,
    ),
    null,
    50,
    Gender.Male,
    Nature.Hardy,
    params.ability
      ? new Ability(
          1,
          params.ability,
          params.ability,
          'テスト',
          AbilityTrigger.Passive,
          AbilityCategory.Other,
        )
      : null,
    31,
    31,
    31,
    31,
    31,
    31,
    0,
    0,
    0,
    0,
    0,
    0,
  );
};

const status = (
  volatileState: VolatileState = {},
  persistentState: PersistentPokemonState = {},
  id = 1,
): BattlePokemonStatus =>
  new BattlePokemonStatus(
    id,
    1,
    1,
    1,
    true,
    100,
    200,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    StatusCondition.None,
    volatileState,
    persistentState,
  );

describe('battle-pokemon-traits', () => {
  describe('battleTypeNamesOf', () => {
    it('フォルムを書いたら、表のタイプになる（ダルマモード）', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 555, types: ['ほのお'] });

      // Act
      const types = battleTypeNamesOf(pokemon, status({ form: 'zen' }));

      // Assert
      expect(types).toEqual(['ほのお', 'エスパー']);
    });

    it('交代しても残るフォルム（persistentState.form）も読む', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 351, types: ['ノーマル'] });

      // Act
      const types = battleTypeNamesOf(pokemon, status({}, { form: 'rainy' }));

      // Assert
      expect(types).toEqual(['みず']);
    });

    it('へんしん中は、自分のフォルムを見ない', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 555, types: ['ほのお'] });

      // Act
      const types = battleTypeNamesOf(
        pokemon,
        status({ form: 'zen', transformedIntoStatusId: 2, typeOverride: ['みず'] }),
      );

      // Assert
      expect(types).toEqual(['みず']);
    });
  });

  describe('battleAbilityNameOf', () => {
    it('相手のかがくへんかガスで特性が消える', () => {
      // Arrange
      const pokemon = trained({ ability: 'いかく' });
      const opponent = {
        trainedPokemon: trained({ ability: 'かがくへんかガス' }),
        status: status({}, {}, 2),
      };

      // Act
      const name = battleAbilityNameOf(pokemon, status(), [opponent]);

      // Assert
      expect(name).toBeUndefined();
    });
  });

  describe('battleStatsOf', () => {
    it('フォルムの種族値で実数値を計算し、statOverrides を上書きする', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 681, base: [60, 50, 140, 50, 140, 60] });

      // Act
      const stats = battleStatsOf(pokemon, status({ form: 'blade', statOverrides: { speed: 1 } }));

      // Assert
      // 攻撃: floor((2 * 140 + 31) * 50 / 100) + 5 = 160、防御: floor((2 * 50 + 31) / 2) + 5 = 70
      expect(stats).toEqual({
        attack: 160,
        defense: 70,
        specialAttack: 160,
        specialDefense: 70,
        speed: 1,
      });
    });

    it('フォルムがなければ、DB の種族値を使う', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 681, base: [60, 50, 140, 50, 140, 60] });

      // Act
      const stats = battleStatsOf(pokemon, status());

      // Assert
      expect(stats.attack).toBe(70);
      expect(stats.defense).toBe(160);
    });
  });

  describe('battleMaxHpOf', () => {
    it('フォルムの HP の種族値で最大 HP を計算する（パーフェクトフォルム）', () => {
      // Arrange
      const pokemon = trained({ nationalDex: 718, base: [108, 100, 121, 81, 95, 95] });

      // Act
      const maxHp = battleMaxHpOf(pokemon, 'complete');

      // Assert
      // floor((2 * 216 + 31) * 50 / 100) + 50 + 10 = 291
      expect(maxHp).toBe(291);
    });
  });
});
