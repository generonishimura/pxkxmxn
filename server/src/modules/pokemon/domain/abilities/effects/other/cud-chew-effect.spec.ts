import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { eatItem } from '../../../battle-events/eat-item';

describe('CudChewEffect（はんすう）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  const effect = () => AbilityRegistry.get('はんすう')!;
  /** 次のターン（2）のコンテキスト */
  const nextTurnContext = async (battle: ReturnType<typeof createInMemoryBattle>) => {
    await battle.battleRepository.update(1, { turn: 2 });
    return battle.context();
  };

  it('きのみを食べたら、食べたきのみとターンを覚える', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'はんすう',
      status: { currentHp: 10, persistentState: { item: 'オボンのみ' } },
    });

    // Act
    await eatItem(get(1), context());

    // Assert
    expect(get(1).volatileState.cudChew).toEqual({ itemName: 'オボンのみ', turn: 1 });
  });

  it('食べたターンのターン終了時には、食べ直さない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'はんすう',
      status: {
        currentHp: 10,
        maxHp: 100,
        volatileState: { cudChew: { itemName: 'オボンのみ', turn: 1 } },
      },
    });

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).currentHp).toBe(10);
    expect(get(1).volatileState.cudChew).toEqual({ itemName: 'オボンのみ', turn: 1 });
  });

  it('次のターンのターン終了時に、同じきのみをもう一度食べて、覚えたきのみを消す', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      ability: 'はんすう',
      status: {
        currentHp: 10,
        maxHp: 100,
        volatileState: { cudChew: { itemName: 'オボンのみ', turn: 1 } },
      },
    });
    const { get } = battle;
    const nextTurn = await nextTurnContext(battle);

    // Act
    await effect().onTurnEnd?.(get(1), nextTurn);

    // Assert
    expect(get(1).currentHp).toBe(35);
    expect(get(1).volatileState.cudChew).toBeUndefined();
  });

  it('食べ直すきのみは、そのときの状態に効く（ラムのみでやけどを治す）', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      ability: 'はんすう',
      status: {
        statusCondition: StatusCondition.Burn,
        volatileState: { cudChew: { itemName: 'ラムのみ', turn: 1 } },
      },
    });
    const { get } = battle;
    const nextTurn = await nextTurnContext(battle);

    // Act
    await effect().onTurnEnd?.(get(1), nextTurn);

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.None);
  });

  it('食べ直したきのみは、もう一度は覚えない（1 回だけ）', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      ability: 'はんすう',
      status: {
        currentHp: 10,
        volatileState: { cudChew: { itemName: 'オボンのみ', turn: 1 } },
      },
    });
    const { get } = battle;
    const nextTurn = await nextTurnContext(battle);

    // Act
    await effect().onTurnEnd?.(get(1), nextTurn);

    // Assert
    expect(get(1).volatileState.cudChew).toBeUndefined();
  });

  it('相手のきんちょうかんがいても、食べ直す（本家と同じく食べる判定をしない）', async () => {
    // Arrange
    const battle = createInMemoryBattle(
      {
        ability: 'はんすう',
        status: {
          currentHp: 10,
          maxHp: 100,
          volatileState: { cudChew: { itemName: 'オボンのみ', turn: 1 } },
        },
      },
      { ability: 'きんちょうかん' },
    );
    const { get } = battle;
    const nextTurn = await nextTurnContext(battle);

    // Act
    await effect().onTurnEnd?.(get(1), nextTurn);

    // Assert
    expect(get(1).currentHp).toBe(35);
  });

  it('覚えたきのみがなければ何もしない', async () => {
    // Arrange
    const { get, context, battleRepository } = createInMemoryBattle({
      ability: 'はんすう',
      status: { currentHp: 10 },
    });

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).currentHp).toBe(10);
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
