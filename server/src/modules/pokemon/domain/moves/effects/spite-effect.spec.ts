import { BattlePokemonMove } from '@/modules/battle/domain/entities/battle-pokemon-move.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { MoveRegistry } from '../move-registry';
import { SpiteEffect } from './spite-effect';

describe('SpiteEffect（うらみ）', () => {
  it('相手が最後に使った技の PP を 4 減らす', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { lastMoveId: 33 } } },
    );
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(7, 2, 33, 10, 35),
    ]);

    // Act
    const message = await new SpiteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(7, { currentPp: 6 });
    expect(message).toBe('reduced its PP by 4!');
  });

  it('残りの PP が 4 より少なければ、残りをすべて減らす', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { lastMoveId: 33 } } },
    );
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(7, 2, 33, 3, 35),
    ]);

    // Act
    const message = await new SpiteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(7, { currentPp: 0 });
    expect(message).toBe('reduced its PP by 3!');
  });

  it('ものまねで入れ替わった技なら、入れ替わった技の PP を減らす', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      {
        status: {
          volatileState: {
            lastMoveId: 99,
            moveSlotOverrides: [{ battlePokemonMoveId: 7, moveId: 99, currentPp: 5, maxPp: 5 }],
          },
        },
      },
    );
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(7, 2, 33, 10, 35),
    ]);

    // Act
    const message = await new SpiteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.moveSlotOverrides).toEqual([
      { battlePokemonMoveId: 7, moveId: 99, currentPp: 1, maxPp: 5 },
    ]);
    expect(message).toBe('reduced its PP by 4!');
  });

  it('最後に使った技の PP が 0 なら失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { lastMoveId: 33 } } },
    );
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(7, 2, 33, 0, 35),
    ]);

    // Act
    const message = await new SpiteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });

  it('最後に使った技を覚えていなければ（わるあがきなど）失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle(
      {},
      { status: { volatileState: { lastMoveId: 165 } } },
    );
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(7, 2, 33, 10, 35),
    ]);

    // Act
    const message = await new SpiteEffect().onUse(get(1), get(2), context());

    // Assert
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    expect(message).toBe('But it failed');
  });

  it('相手がまだ技を使っていなければ失敗する', () => {
    // Arrange
    const { get } = createInMemoryBattle();

    // Act
    const fails = new SpiteEffect().shouldFail(get(1), get(2));

    // Assert
    expect(fails).toBe(true);
  });

  it('相手が技を使っていれば、技を出す前には失敗にしない', () => {
    // Arrange
    const { get } = createInMemoryBattle({}, { status: { volatileState: { lastMoveId: 33 } } });

    // Act
    const fails = new SpiteEffect().shouldFail(get(1), get(2));

    // Assert
    expect(fails).toBe(false);
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('うらみ');

    // Assert
    expect(effect).toBeInstanceOf(SpiteEffect);
  });
});
