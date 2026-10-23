import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('HarvestEffect（しゅうかく）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const effect = () => AbilityRegistry.get('しゅうかく')!;
  const ateBerry = (item = 'オボンのみ') =>
    createInMemoryBattle({
      ability: 'しゅうかく',
      status: { persistentState: { consumedItem: item } },
    });

  it('1/2 の確率で、使い切ったきのみを持ち直し、使い切った持ち物を消す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.49);
    const { get, context } = ateBerry();

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBe('オボンのみ');
    expect(get(1).persistentState.consumedItem).toBeUndefined();
  });

  it('確率に外れたら、持ち直さない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { get, context } = ateBerry();

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBeUndefined();
    expect(get(1).persistentState.consumedItem).toBe('オボンのみ');
  });

  it('晴れなら、必ず持ち直す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const { get, context } = ateBerry();

    // Act
    await effect().onTurnEnd?.(get(1), context({ weather: Weather.Sun }));

    // Assert
    expect(get(1).persistentState.item).toBe('オボンのみ');
  });

  it('使い切った持ち物がきのみでなければ、持ち直さない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { get, context } = ateBerry('きあいのタスキ');

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBeUndefined();
  });

  it('持ち物を持っていれば、持ち直さない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { get, context } = createInMemoryBattle({
      ability: 'しゅうかく',
      status: { persistentState: { item: 'たべのこし', consumedItem: 'オボンのみ' } },
    });

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBe('たべのこし');
    expect(get(1).persistentState.consumedItem).toBe('オボンのみ');
  });
});
