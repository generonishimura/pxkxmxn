import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { FreezingGlareEffect } from './freezing-glare-effect';

describe('FreezingGlareEffect（いてつくしせん）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('10% に当たれば、相手をこおりにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.09);

    // Act
    const message = await new FreezingGlareEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Freeze);
    expect(message).toBe('was frozen solid!');
  });

  it('10% に外れれば、こおりにしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    // Act
    const message = await new FreezingGlareEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
    expect(message).toBeNull();
  });

  it('こおりタイプの相手はこおりにならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['こおり'] });
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // Act
    await new FreezingGlareEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).statusCondition).toBeNull();
  });
});
