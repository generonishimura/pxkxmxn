import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { PersistentPokemonState } from '@/modules/battle/domain/state/persistent-state';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { AbilityRegistry } from '../../ability-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('UnburdenEffect（かるわざ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  const effect = () => AbilityRegistry.get('かるわざ')!;
  const createPokemon = (
    volatileState: VolatileState,
    persistentState: PersistentPokemonState = {},
  ): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null, volatileState, {
      ...persistentState,
    });

  describe('modifySpeed', () => {
    it('持ち物を失ったあと（unburden）、持ち物を持っていなければ素早さが 2 倍', () => {
      // Act
      const speed = effect().modifySpeed?.(createPokemon({ unburden: true }), 100);

      // Assert
      expect(speed).toBe(200);
    });

    it('持ち物を失っていなければ、素早さは変わらない', () => {
      // Act
      const speed = effect().modifySpeed?.(createPokemon({}), 100);

      // Assert
      expect(speed).toBeUndefined();
    });

    it('持ち物を失ったあとでも、また持ち物を持っていれば、素早さは変わらない', () => {
      // Act
      const speed = effect().modifySpeed?.(
        createPokemon({ unburden: true }, { item: 'たべのこし' }),
        100,
      );

      // Assert
      expect(speed).toBeUndefined();
    });
  });

  describe('onItemLost', () => {
    it('volatileState.unburden を書く', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({ ability: 'かるわざ' });

      // Act
      await effect().onItemLost?.(get(1), 'たべのこし', context());

      // Assert
      expect(get(1).volatileState.unburden).toBe(true);
    });

    it('ひんしなら書かない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'かるわざ',
        status: { currentHp: 0 },
      });

      // Act
      await effect().onItemLost?.(get(1), 'たべのこし', context());

      // Assert
      expect(get(1).volatileState.unburden).toBeUndefined();
    });
  });
});
