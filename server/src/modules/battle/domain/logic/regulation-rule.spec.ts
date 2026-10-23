import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { typeOf } from '../../application/__tests__/battle-engine-harness';
import { Regulation } from '../regulations/regulation';
import { Nature } from './stat-calculator';
import { findRegulationProblem, regulationProblemMessage } from './regulation-rule';

describe('regulation-rule', () => {
  /** テスト用のレギュレーション（全国図鑑の 1・4・7 と、たべのこし・リザードナイトＸ が使える） */
  const regulation: Regulation = {
    name: 'TEST',
    allowedNationalDex: new Set([1, 4, 7]),
    allowedItems: new Set(['たべのこし', 'リザードナイトＸ']),
  };

  /**
   * 育成ポケモン 1 匹（id は TrainedPokemon の ID）
   */
  const member = (
    id: number,
    nationalDex: number,
    heldItem: string | null = null,
  ): TrainedPokemon =>
    new TrainedPokemon(
      id,
      1,
      new Pokemon(
        id,
        nationalDex,
        `テスト${nationalDex}`,
        'Test',
        typeOf('ノーマル'),
        null,
        100,
        100,
        100,
        100,
        100,
        100,
      ),
      null,
      Gender.Male,
      Nature.Serious,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      heldItem,
    );

  describe('findRegulationProblem', () => {
    it('全員が使えるポケモンで、持ち物が使えるものかなしなら undefined を返す', () => {
      // Arrange
      const team = [member(1, 1, 'たべのこし'), member(2, 4), member(3, 7, 'リザードナイトＸ')];

      // Act
      const problem = findRegulationProblem(team, regulation);

      // Assert
      expect(problem).toBeUndefined();
    });

    it('使えないポケモンがいれば、そのポケモンの全国図鑑の番号と名前を speciesNotAllowed で返す', () => {
      // Arrange
      const team = [member(1, 1), member(2, 150), member(3, 7)];

      // Act
      const problem = findRegulationProblem(team, regulation);

      // Assert
      expect(problem).toEqual({
        kind: 'speciesNotAllowed',
        nationalDex: 150,
        pokemonName: 'テスト150',
      });
    });

    it('使えない持ち物を持つポケモンがいれば、その持ち物を itemNotAllowed で返す', () => {
      // Arrange
      const team = [member(1, 1), member(2, 4, 'こだわりハチマキ'), member(3, 7)];

      // Act
      const problem = findRegulationProblem(team, regulation);

      // Assert
      expect(problem).toEqual({ kind: 'itemNotAllowed', item: 'こだわりハチマキ' });
    });

    it('前のポケモンの持ち物が使えず、後ろのポケモンが使えないなら、前から見て先に見つかった持ち物を返す', () => {
      // Arrange
      const team = [member(1, 1, 'こだわりハチマキ'), member(2, 150), member(3, 7)];

      // Act
      const problem = findRegulationProblem(team, regulation);

      // Assert
      expect(problem).toEqual({ kind: 'itemNotAllowed', item: 'こだわりハチマキ' });
    });

    it('ポケモンも持ち物も使えないなら、ポケモンのほうを返す', () => {
      // Arrange
      const team = [member(1, 150, 'こだわりハチマキ'), member(2, 4), member(3, 7)];

      // Act
      const problem = findRegulationProblem(team, regulation);

      // Assert
      expect(problem).toEqual({
        kind: 'speciesNotAllowed',
        nationalDex: 150,
        pokemonName: 'テスト150',
      });
    });
  });

  describe('regulationProblemMessage', () => {
    it('speciesNotAllowed のメッセージに、レギュレーションの名前・ポケモンの名前・全国図鑑の番号を入れる', () => {
      // Act
      const message = regulationProblemMessage(
        { kind: 'speciesNotAllowed', nationalDex: 150, pokemonName: 'ミュウツー' },
        regulation,
      );

      // Assert
      expect(message).toBe(
        'ミュウツー (National Pokédex number 150) cannot be used in Regulation TEST',
      );
    });

    it('itemNotAllowed のメッセージに、レギュレーションの名前と持ち物の名前を入れる', () => {
      // Act
      const message = regulationProblemMessage(
        { kind: 'itemNotAllowed', item: 'こだわりハチマキ' },
        regulation,
      );

      // Assert
      expect(message).toBe('The held item こだわりハチマキ cannot be used in Regulation TEST');
    });
  });
});
