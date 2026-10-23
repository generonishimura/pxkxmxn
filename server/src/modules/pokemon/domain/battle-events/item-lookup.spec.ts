import {
  consumeItem,
  getItemEffect,
  heldItemName,
  isItemSuppressed,
  resolveItemName,
} from './item-lookup';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { PersistentPokemonState } from '@/modules/battle/domain/state/persistent-state';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { ItemRegistry } from '../items/item-registry';

describe('item-lookup', () => {
  const createPokemon = (
    persistentState: PersistentPokemonState,
    volatileState: VolatileState = {},
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(
      1,
      1,
      1,
      1,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      volatileState,
      persistentState,
    );

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  describe('resolveItemName', () => {
    it('今持っている持ち物の名前を返す', () => {
      // Act
      const name = resolveItemName(createPokemon({ item: 'たべのこし' }));

      // Assert
      expect(name).toBe('たべのこし');
    });

    it('持ち物がなければ undefined を返す', () => {
      // Act
      const name = resolveItemName(createPokemon({}));

      // Assert
      expect(name).toBeUndefined();
    });
  });

  describe('持ち物の効果を消す状態（さしおさえ）', () => {
    it('さしおさえの間は、持ち物の名前を返さない', () => {
      // Act
      const name = resolveItemName(createPokemon({ item: 'たべのこし' }, { embargoTurns: 3 }));

      // Assert
      expect(name).toBeUndefined();
    });

    it('さしおさえの間は、持ち物の効果を返さない', () => {
      // Act
      const effect = getItemEffect(createPokemon({ item: 'たべのこし' }, { embargoTurns: 3 }));

      // Assert
      expect(effect).toBeUndefined();
    });

    it('heldItemName は、さしおさえの間も持っている持ち物の名前を返す', () => {
      // Act
      const name = heldItemName(createPokemon({ item: 'たべのこし' }, { embargoTurns: 3 }));

      // Assert
      expect(name).toBe('たべのこし');
    });

    it('isItemSuppressed は、さしおさえの間だけ true を返す', () => {
      // Act
      const suppressed = isItemSuppressed(createPokemon({}, { embargoTurns: 1 }));
      const notSuppressed = isItemSuppressed(createPokemon({}));

      // Assert
      expect(suppressed).toBe(true);
      expect(notSuppressed).toBe(false);
    });
  });

  describe('getItemEffect', () => {
    it('持っている持ち物の効果を返す', () => {
      // Act
      const effect = getItemEffect(createPokemon({ item: 'たべのこし' }));

      // Assert
      expect(effect).toBe(ItemRegistry.get('たべのこし'));
    });

    it('持ち物がなければ undefined を返す', () => {
      // Act
      const effect = getItemEffect(createPokemon({}));

      // Assert
      expect(effect).toBeUndefined();
    });
  });

  describe('consumeItem', () => {
    it('持ち物を消し、使った持ち物として残す', async () => {
      // Arrange
      const patchPersistentState = jest.fn().mockResolvedValue(undefined);
      const ctx: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository: { patchPersistentState } as unknown as BattleContext['battleRepository'],
      };

      // Act
      const consumed = await consumeItem(createPokemon({ item: 'オボンのみ' }), ctx);

      // Assert
      expect(consumed).toBe('オボンのみ');
      expect(patchPersistentState).toHaveBeenCalledWith(1, {
        item: null,
        consumedItem: 'オボンのみ',
      });
    });

    it('持ち物がなければ何もしない', async () => {
      // Arrange
      const patchPersistentState = jest.fn();
      const ctx: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
        battleRepository: { patchPersistentState } as unknown as BattleContext['battleRepository'],
      };

      // Act
      const consumed = await consumeItem(createPokemon({}), ctx);

      // Assert
      expect(consumed).toBeUndefined();
      expect(patchPersistentState).not.toHaveBeenCalled();
    });
  });
});
