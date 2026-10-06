import { MetronomeEffect } from './metronome-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { MoveBehaviors } from '../move-behaviors';
import { CallMove } from '../../battle-events/called-move';

describe('MetronomeEffect（ゆびをふる）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ゆびをふるで出る技（metronome）から一つを選んで出す', async () => {
    // Arrange
    const candidates = MoveBehaviors.namesWith('metronome');
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const callMove: jest.MockedFunction<CallMove> = jest
      .fn()
      .mockResolvedValue('Used テスト and dealt 10 damage');
    const { get, context } = createInMemoryBattle();

    // Act
    const message = await new MetronomeEffect().onUse(get(1), get(2), context({ callMove }));

    // Assert
    expect(message).toBe('Used テスト and dealt 10 damage');
    expect(callMove).toHaveBeenCalledWith({
      moveName: candidates[Math.floor(0.5 * candidates.length)],
      calledBy: 'ゆびをふる',
    });
  });

  it('候補の最初と最後の技も選ばれる', async () => {
    // Arrange
    const candidates = MoveBehaviors.namesWith('metronome');
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.999999);
    const callMove: jest.MockedFunction<CallMove> = jest.fn().mockResolvedValue('Used テスト');
    const { get, context } = createInMemoryBattle();
    const effect = new MetronomeEffect();

    // Act
    await effect.onUse(get(1), get(2), context({ callMove }));
    await effect.onUse(get(1), get(2), context({ callMove }));

    // Assert
    expect(callMove.mock.calls.map(([request]) => request.moveName)).toEqual([
      candidates[0],
      candidates[candidates.length - 1],
    ]);
  });

  it('ゆびをふる自身やねごとなど、metronome でない技は候補に入らない', () => {
    // Act
    const candidates = MoveBehaviors.namesWith('metronome');

    // Assert
    expect(candidates).not.toContain('ゆびをふる');
    expect(candidates).not.toContain('ねごと');
    expect(candidates).toContain('かえんほうしゃ');
  });

  it('別の技を出す仕組み（callMove）がなければ失敗する', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle();

    // Act
    const message = await new MetronomeEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
