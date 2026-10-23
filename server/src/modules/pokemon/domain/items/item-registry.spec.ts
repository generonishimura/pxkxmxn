import { ItemRegistry } from './item-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ItemRegistry', () => {
  const createPokemon = (currentHp: number, maxHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createContext = (overrides: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
    ...overrides,
  });

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  it('登録していない持ち物は undefined を返す', () => {
    // Act
    const effect = ItemRegistry.get('こだわりハチマキ');

    // Assert
    expect(effect).toBeUndefined();
  });

  describe('もくたん', () => {
    it('ほのおタイプの技の威力を 1.2 倍（4915/4096）にする', () => {
      // Arrange
      const effect = ItemRegistry.get('もくたん');

      // Act
      const power = effect?.modifyBasePower?.(
        createPokemon(100, 100),
        100,
        createContext({ moveTypeName: 'ほのお' }),
      );

      // Assert
      expect(power).toBe(120);
    });

    it('ほのおタイプ以外の技の威力は変えない', () => {
      // Arrange
      const effect = ItemRegistry.get('もくたん');

      // Act
      const power = effect?.modifyBasePower?.(
        createPokemon(100, 100),
        100,
        createContext({ moveTypeName: 'みず' }),
      );

      // Assert
      expect(power).toBeUndefined();
    });
  });

  describe('たべのこし', () => {
    it('ターン終了時に最大 HP の 1/16 を回復する', async () => {
      // Arrange
      const effect = ItemRegistry.get('たべのこし');
      const ctx = createContext();

      // Act
      await effect?.onTurnEnd?.(createPokemon(50, 160), ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        currentHp: 60,
      });
    });

    it('HP が満タンなら回復しない', async () => {
      // Arrange
      const effect = ItemRegistry.get('たべのこし');
      const ctx = createContext();

      // Act
      await effect?.onTurnEnd?.(createPokemon(160, 160), ctx);

      // Assert
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
