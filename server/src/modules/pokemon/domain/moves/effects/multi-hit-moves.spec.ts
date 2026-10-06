import { TwoToFiveHitEffect } from './two-to-five-hit-effect';
import { TwoHitEffect } from './two-hit-effect';
import { TripleDiveEffect } from './triple-dive-effect';
import { TwineedleEffect } from './twineedle-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveCategory } from '../../entities/move.entity';
import { Type } from '../../entities/type.entity';
import {
  createBattleContext,
  createBattlePokemonStatus,
  createMove,
} from './__tests__/test-helpers';

describe('連続技の効果', () => {
  const move = createMove(
    'テスト連続技',
    'Test',
    new Type(1, 'ノーマル', 'Normal'),
    MoveCategory.Physical,
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('TwoToFiveHitEffect は2〜5回の範囲で攻撃回数を決める', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const context = createBattleContext();

    // Act
    await new TwoToFiveHitEffect().beforeDamage(
      createBattlePokemonStatus(),
      createBattlePokemonStatus({ id: 2 }),
      move,
      context,
    );

    // Assert
    expect(new TwoToFiveHitEffect().getHitRange()).toEqual({ min: 2, max: 5 });
    expect(context.multiHitCount).toBe(5);
  });

  it.each([
    ['TwoHitEffect', 2, new TwoHitEffect()],
    ['TripleDiveEffect', 3, new TripleDiveEffect()],
    ['TwineedleEffect', 2, new TwineedleEffect()],
  ])('%s は毎回%i回攻撃する', async (_name, hits, effect) => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const context = createBattleContext();

    // Act
    await effect.beforeDamage(
      createBattlePokemonStatus(),
      createBattlePokemonStatus({ id: 2 }),
      move,
      context,
    );

    // Assert
    expect(context.multiHitCount).toBe(hits);
  });

  describe('TwineedleEffect の追加効果', () => {
    const createContext = (defenderTypeName: string): BattleContext => ({
      ...createBattleContext(),
      battleRepository: {
        updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
      } as unknown as BattleContext['battleRepository'],
      trainedPokemonRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 2,
          pokemon: { id: 2, primaryType: { name: defenderTypeName }, secondaryType: null },
          ability: null,
        }),
      } as unknown as BattleContext['trainedPokemonRepository'],
    });

    it('20%の確率に当たると相手をどくにする', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.19);
      const defender = createBattlePokemonStatus({ id: 2 });
      const context = createContext('ノーマル');

      // Act
      const result = await new TwineedleEffect().onHit(
        createBattlePokemonStatus(),
        defender,
        context,
      );

      // Assert
      expect(result).toBe('was poisoned!');
      expect(context.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        statusCondition: StatusCondition.Poison,
      });
    });

    it('20%の確率に当たらなければどくにしない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.2);
      const context = createContext('ノーマル');

      // Act
      const result = await new TwineedleEffect().onHit(
        createBattlePokemonStatus(),
        createBattlePokemonStatus({ id: 2 }),
        context,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('はがねタイプの相手はどくにならない', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const context = createContext('はがね');

      // Act
      const result = await new TwineedleEffect().onHit(
        createBattlePokemonStatus(),
        createBattlePokemonStatus({ id: 2 }),
        context,
      );

      // Assert
      expect(result).toBeNull();
    });
  });
});
