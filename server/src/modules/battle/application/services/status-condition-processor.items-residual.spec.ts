import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { StatusConditionProcessorService } from './status-condition-processor.service';

/**
 * ターン終了時の回復・バインドに効く持ち物（おおきなねっこ・しめつけバンド）
 * ID 1 がトレーナー1、ID 2 がトレーナー2 の場のポケモン（最大 HP 100）
 */
describe('StatusConditionProcessorService - ターン終了時の回復・バインドの持ち物', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
    jest.spyOn(StatusConditionHandler, 'shouldClearSleep').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runTurnEnd = async (first: InMemoryPokemon = {}, second: InMemoryPokemon = {}) => {
    const memory = createInMemoryBattle(first, second);
    const processor = new StatusConditionProcessorService(
      memory.battleRepository,
      memory.trainedPokemonRepository,
    );
    await processor.processTurnEndAbilities(await memory.battleRepository.findById(1));
    return memory;
  };

  describe('おおきなねっこ', () => {
    it.each([[{ aquaRing: true }], [{ ingrain: true }]])(
      '%j の回復を 1.3 倍（5324/4096）にする',
      async volatileState => {
        // Act
        const { get } = await runTurnEnd({
          status: { currentHp: 50, volatileState, persistentState: { item: 'おおきなねっこ' } },
        });

        // Assert（1/16 = 6 → 8）
        expect(get(1).currentHp).toBe(58);
      },
    );

    it('やどりぎのタネで吸った回復を 1.3 倍にする', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 50, persistentState: { item: 'おおきなねっこ' } } },
        { status: { volatileState: { leechSeed: true } } },
      );

      // Assert（1/8 = 12 → 16）
      expect(get(2).currentHp).toBe(88);
      expect(get(1).currentHp).toBe(66);
    });

    it('植えられた側が持っていても、植えた側の回復は変えない', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { currentHp: 50 } },
        {
          status: {
            volatileState: { leechSeed: true },
            persistentState: { item: 'おおきなねっこ' },
          },
        },
      );

      // Assert
      expect(get(1).currentHp).toBe(62);
    });
  });

  describe('しめつけバンド', () => {
    it('しめつけたポケモンが持っていると、バインドのダメージが最大 HP の 1/6 になる', async () => {
      // Act
      const { get } = await runTurnEnd(
        { status: { volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } } } },
        { status: { persistentState: { item: 'しめつけバンド' } } },
      );

      // Assert
      expect(get(1).currentHp).toBe(84);
    });

    it('しめつけられた側が持っていても、ダメージは 1/8 のまま', async () => {
      // Act
      const { get } = await runTurnEnd({
        status: {
          volatileState: { partialTrap: { sourceStatusId: 2, moveId: 9, turns: 3 } },
          persistentState: { item: 'しめつけバンド' },
        },
      });

      // Assert
      expect(get(1).currentHp).toBe(88);
    });
  });
});
