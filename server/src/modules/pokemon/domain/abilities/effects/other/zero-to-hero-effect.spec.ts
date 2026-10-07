import { ZeroToHeroEffect } from './zero-to-hero-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('ZeroToHeroEffect（マイティチェンジ）', () => {
  const PALAFIN = 964;
  const effect = new ZeroToHeroEffect();

  it('引っ込むと、ナイーブフォルムのイルカマンはマイティフォルムになる（交代しても残る）', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: PALAFIN });

    // Act
    await effect.onSwitchOut(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBe('hero');
    expect(battle.get(1).volatileState.form).toBeUndefined();
  });

  it('すでにマイティフォルムなら何も書かない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: PALAFIN,
      status: { persistentState: { form: 'hero' } },
    });

    // Act
    await effect.onSwitchOut(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBe('hero');
    expect(battle.battleRepository.patchPersistentState).not.toHaveBeenCalled();
  });

  it('イルカマンでなければフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: 25 });

    // Act
    await effect.onSwitchOut(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBeUndefined();
  });

  it('へんしん中はフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: PALAFIN,
      status: { volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    await effect.onSwitchOut(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBeUndefined();
  });

  it('コンテキストがなければ何もしない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: PALAFIN });

    // Act
    await effect.onSwitchOut(battle.get(1));

    // Assert
    expect(battle.battleRepository.patchPersistentState).not.toHaveBeenCalled();
  });
});
