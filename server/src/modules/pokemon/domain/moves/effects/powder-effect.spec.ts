import { PowderEffect } from './powder-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('PowderEffect（ふんじん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('相手にふんじんをかける', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new PowderEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.powder).toBe(true);
    expect(message).toBe('is covered in powder!');
  });

  it('相手がくさタイプなら効かない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['ほのお', 'くさ'] });

    // Act
    const message = await new PowderEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.powder).toBeUndefined();
    expect(message).toBe('But it failed');
  });

  it('相手がすでにふんじんをかけられていれば失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { powder: true } } },
    );

    // Act
    const message = await new PowderEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });

  it('MoveRegistry に ふんじん として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('ふんじん');

    // Assert
    expect(effect).toBeInstanceOf(PowderEffect);
  });
});
