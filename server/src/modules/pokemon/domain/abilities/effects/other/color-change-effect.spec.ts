import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { HitResult } from '../../../battle-events/hit-result';
import { ColorChangeEffect } from './color-change-effect';

describe('ColorChangeEffect（へんしょく）', () => {
  const createHit = (moveTypeName: string, overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName,
    moveCategory: 'Physical',
    targetFainted: false,
    ...overrides,
  });

  it('受けた技のタイプを持っていなければ、そのタイプだけになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'] });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit('ほのお'),
      battle.context(),
    );

    // Assert
    expect(message).toBe('became the ほのお type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['ほのお']);
  });

  it('受けた技のタイプをすでに持っていれば、タイプは変わらない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ほのお', 'ひこう'] });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit('ひこう'),
      battle.context(),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('足されたタイプ（ハロウィンのゴースト）と同じタイプの技では、タイプは変わらない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      types: ['ノーマル'],
      status: { volatileState: { addedType: 'ゴースト' } },
    });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit('ゴースト'),
      battle.context(),
    );

    // Assert
    expect(message).toBeNull();
  });

  it('ひんしになったら、タイプは変わらない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'], status: { currentHp: 0 } });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit('かくとう', { targetFainted: true }),
      battle.context(),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it.each(['???', 'なし'])('タイプなしの技（%s）では、タイプは変わらない', async typeName => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'] });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit(typeName),
      battle.context(),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it('アルセウスはタイプを変えられない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'], nationalDex: 493 });

    // Act
    const message = await new ColorChangeEffect().onAfterMoveHit(
      battle.get(1),
      battle.get(2),
      createHit('みず'),
      battle.context(),
    );

    // Assert
    expect(message).toBeNull();
  });
});
