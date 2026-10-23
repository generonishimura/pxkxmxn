import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { DireClawEffect } from './dire-claw-effect';

describe('DireClawEffect（フェイタルクロー）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [0.0, StatusCondition.Poison, 'was poisoned!'],
    [0.4, StatusCondition.Paralysis, 'was paralyzed!'],
    [0.7, StatusCondition.Sleep, 'fell asleep!'],
  ])(
    '30% に当たれば、2 回目の乱数 %s で選んだ状態異常にする',
    async (pick, expected, expectedMessage) => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.29).mockReturnValue(pick);

      // Act
      const message = await new DireClawEffect().onHit(get(1), get(2), context());

      // Assert
      expect(get(2).statusCondition).toBe(expected);
      expect(message).toBe(expectedMessage);
    },
  );

  it('30% に外れれば、状態異常にしない（チャンピオンズの確率。SV は 50%）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.3);

    // Act
    const message = await new DireClawEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('選ばれた状態異常に免疫があれば、ほかの状態異常にはしない（本家と同じ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['でんき'] });
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.4);

    // Act
    const message = await new DireClawEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });
});
