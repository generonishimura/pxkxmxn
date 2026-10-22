import { HungerSwitchEffect } from './hunger-switch-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('HungerSwitchEffect（はらぺこスイッチ）', () => {
  const MORPEKO = 877;
  const effect = new HungerSwitchEffect();

  it('ターン終了時に、まんぷくもようのモルペコははらぺこもようになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: MORPEKO });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBe('hangry');
  });

  it('ターン終了時に、はらぺこもようのモルペコはまんぷくもよう（既定のフォルム）に戻る', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: MORPEKO,
      status: { volatileState: { form: 'hangry' } },
    });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBeUndefined();
  });

  it('毎ターン、はらぺこもようとまんぷくもようを交互にくり返す', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: MORPEKO });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());
    await effect.onTurnEnd(battle.get(1), battle.context());
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBe('hangry');
  });

  it('モルペコでなければフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: 25 });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBeUndefined();
  });

  it('へんしん中はフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: MORPEKO,
      status: { volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBeUndefined();
  });

  it('ひんしならフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: MORPEKO, status: { currentHp: 0 } });

    // Act
    await effect.onTurnEnd(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBeUndefined();
  });

  it('コンテキストがなければ何もしない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: MORPEKO });

    // Act
    await effect.onTurnEnd(battle.get(1));

    // Assert
    expect(battle.battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
