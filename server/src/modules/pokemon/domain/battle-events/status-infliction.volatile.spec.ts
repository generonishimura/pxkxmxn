import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { canInflictStatus, inflictStatus, tryInflictStatus } from './status-infliction';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('こんらん・ひるみの付与（volatileState に書く）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('やけど中のポケモンもこんらんにできる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { statusCondition: StatusCondition.Burn } },
    );

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Confusion, context());

    // Assert
    expect(result.inflicted).toBe(true);
    expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    expect(get(2).volatileState.confusionTurns).toBeGreaterThanOrEqual(2);
  });

  it.each([
    [0, 2],
    [0.99, 5],
  ])(
    'こんらんの残り回数は 2〜5 で決める（乱数 %s なら %s）',
    async (random: number, turns: number) => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(random);
      const { context, get } = createInMemoryBattle();

      // Act
      await inflictStatus(get(2), StatusCondition.Confusion, context());

      // Assert
      expect(get(2).volatileState.confusionTurns).toBe(turns);
    },
  );

  it('すでにこんらんしていれば付与できない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { confusionTurns: 3 } } },
    );

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Confusion, context());

    // Assert
    expect(result).toBe(false);
  });

  it('ひるみは flinched に書き、状態異常の欄は変えない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { statusCondition: StatusCondition.Paralysis } },
    );

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Flinch, context());

    // Assert
    expect(result.inflicted).toBe(true);
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(get(2).volatileState.flinched).toBe(true);
  });

  it('マイペースはこんらんを防ぐ', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'マイペース' });

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Confusion, context());

    // Assert
    expect(result).toBe(false);
  });

  it('せいしんりょくはひるみを防ぐ', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'せいしんりょく' });

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Flinch, context());

    // Assert
    expect(result).toBe(false);
  });

  it('こんらんにしても、状態異常があることにはならない（あとからどくにできる）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    await tryInflictStatus(get(2), StatusCondition.Confusion, context());

    // Act
    const result = await tryInflictStatus(get(2), StatusCondition.Poison, context());

    // Assert
    expect(result.inflicted).toBe(true);
    expect(get(2).statusCondition).toBe(StatusCondition.Poison);
    expect(get(2).volatileState.confusionTurns).toBeDefined();
  });
});
