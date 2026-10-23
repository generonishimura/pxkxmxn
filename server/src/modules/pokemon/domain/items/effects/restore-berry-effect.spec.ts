import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { applyIndirectDamage } from '../../battle-events/indirect-damage';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ItemRegistry } from '../item-registry';

describe('HP・PP を回復するきのみ', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('オボンのみ', () => {
    it('HP が半分以下になったら食べて、最大 HP の 1/4 を回復する', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 50, maxHp: 201, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const message = await ItemRegistry.get('オボンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(get(1).persistentState.consumedItem).toBe('オボンのみ');
      expect(message).toContain('オボンのみ');
    });

    it('HP がちょうど半分なら食べる', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 50, maxHp: 100, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await ItemRegistry.get('オボンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(75);
    });

    it('HP が半分より多ければ食べない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 51, maxHp: 100, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const message = await ItemRegistry.get('オボンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).currentHp).toBe(51);
      expect(get(1).persistentState.item).toBe('オボンのみ');
    });

    it('かいふくふうじ中は食べない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: {
          currentHp: 30,
          maxHp: 100,
          volatileState: { healBlockTurns: 3 },
          persistentState: { item: 'オボンのみ' },
        },
      });

      // Act
      await ItemRegistry.get('オボンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(30);
      expect(get(1).persistentState.item).toBe('オボンのみ');
    });

    it('技以外のダメージ（どく・すなあらしなど）で HP が半分以下になったら、すぐに食べる', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 60, maxHp: 100, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await applyIndirectDamage(get(1), 20, context());

      // Assert
      expect(get(1).currentHp).toBe(65);
      expect(get(1).persistentState.item).toBeUndefined();
    });
  });

  describe('オレンのみ', () => {
    it('HP が半分以下になったら食べて、HP を 10 回復する', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 40, maxHp: 100, persistentState: { item: 'オレンのみ' } },
      });

      // Act
      const message = await ItemRegistry.get('オレンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(50);
      expect(get(1).persistentState.consumedItem).toBe('オレンのみ');
      expect(message).toContain('オレンのみ');
    });

    it('HP が半分より多ければ食べない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 51, maxHp: 100, persistentState: { item: 'オレンのみ' } },
      });

      // Act
      await ItemRegistry.get('オレンのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(51);
    });
  });

  describe('ヒメリのみ', () => {
    it('PP が 0 の技があれば食べて、その技の PP を 10 回復する', async () => {
      // Arrange
      const { get, context, battleRepository } = createInMemoryBattle({
        status: { persistentState: { item: 'ヒメリのみ' } },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(10, 1, 33, 5, 35),
        new BattlePokemonMove(11, 1, 34, 0, 15),
      ]);

      // Act
      const message = await ItemRegistry.get('ヒメリのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(11, {
        currentPp: 10,
      });
      expect(get(1).persistentState.consumedItem).toBe('ヒメリのみ');
      expect(message).toContain('ヒメリのみ');
    });

    it('最大 PP が 10 より少ない技は、最大 PP まで回復する', async () => {
      // Arrange
      const { get, context, battleRepository } = createInMemoryBattle({
        status: { persistentState: { item: 'ヒメリのみ' } },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(11, 1, 34, 0, 5),
      ]);

      // Act
      await ItemRegistry.get('ヒメリのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(11, { currentPp: 5 });
    });

    it('PP が 0 の技がなければ食べない', async () => {
      // Arrange
      const { get, context, battleRepository } = createInMemoryBattle({
        status: { persistentState: { item: 'ヒメリのみ' } },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(10, 1, 33, 1, 35),
      ]);

      // Act
      const message = await ItemRegistry.get('ヒメリのみ')?.onUpdate?.(get(1), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState.item).toBe('ヒメリのみ');
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    });

    it('食べたとき（onEat）PP が 0 の技がなければ、PP が減っている先頭の技を回復する', async () => {
      // Arrange
      const { get, context, battleRepository } = createInMemoryBattle();
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(10, 1, 33, 35, 35),
        new BattlePokemonMove(11, 1, 34, 3, 15),
      ]);

      // Act
      const message = await ItemRegistry.get('ヒメリのみ')?.onEat?.(
        get(1),
        'ヒメリのみ',
        context(),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(11, {
        currentPp: 13,
      });
      expect(message).toBe('ヒメリのみ restored PP to its move!');
    });
  });
});
