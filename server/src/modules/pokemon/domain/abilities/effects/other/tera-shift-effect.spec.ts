import { TeraShiftEffect } from './tera-shift-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { resolveCurrentAbilityName } from '../../../battle-events/ability-change';

describe('TeraShiftEffect（テラスチェンジ）', () => {
  const TERAPAGOS = 1024;
  const effect = new TeraShiftEffect();

  it('場に出ると、テラパゴスはテラスタルフォルムになり（交代しても残る）、特性がテラスシェルになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: TERAPAGOS, ability: 'テラスチェンジ' });

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBe('terastal');
    expect(await resolveCurrentAbilityName(battle.get(1), battle.context())).toBe('テラスシェル');
  });

  it('HP の種族値が 90 から 95 に上がり、減った HP を保ったまま最大 HP が増える', async () => {
    // Arrange: レベル 50・個体値 31・努力値 0 で、HP の種族値 90 は 165、95 は 170
    const battle = createInMemoryBattle({
      nationalDex: TERAPAGOS,
      status: { currentHp: 150, maxHp: 165 },
    });

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).maxHp).toBe(170);
    expect(battle.get(1).currentHp).toBe(155);
  });

  it('すでにテラスタルフォルムなら何も書かない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: TERAPAGOS,
      status: { persistentState: { form: 'terastal' } },
    });

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.battleRepository.patchPersistentState).not.toHaveBeenCalled();
  });

  it('テラパゴスでなければフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: 25 });

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBeUndefined();
  });

  it('へんしん中はフォルムを変えない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: TERAPAGOS,
      status: { volatileState: { transformedIntoStatusId: 2 } },
    });

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).persistentState.form).toBeUndefined();
  });

  it('コンテキストがなければ何もしない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ nationalDex: TERAPAGOS });

    // Act
    await effect.onEntry(battle.get(1));

    // Assert
    expect(battle.battleRepository.patchPersistentState).not.toHaveBeenCalled();
  });
});
