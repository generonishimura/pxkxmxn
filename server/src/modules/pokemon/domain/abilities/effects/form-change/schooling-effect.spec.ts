import { SchoolingEffect } from './schooling-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SchoolingEffect（ぎょぐん）', () => {
  const WISHIWASHI = 746;
  const effect = new SchoolingEffect();

  it('場に出たときに HP が 1/4 より上なら、むれたすがたになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 26, maxHp: 100 },
    });

    // Act
    await effect.onEntry(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBe('school');
  });

  it('場に出たときに HP が 1/4 以下なら、たんどくのすがたのまま', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 25, maxHp: 100 },
    });

    // Act
    await effect.onEntry(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('ターン終了時に HP が 1/4 以下なら、たんどくのすがたに戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 25, maxHp: 100, volatileState: { form: 'school' } },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });

  it('ターン終了時に HP が 1/4 より上に戻っていれば、むれたすがたになる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 30, maxHp: 100 },
    });

    // Act
    await effect.onTurnEnd(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBe('school');
  });

  it('レベルは 50 に固定なので、レベル 20 以上の条件を満たし、むれたすがたになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 100, maxHp: 100 },
    });
    const trainedPokemon = await battle.trainedPokemonRepository.findById(1);

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(trainedPokemon?.level).toBe(50);
    expect(battle.get(1).volatileState.form).toBe('school');
  });

  it('ヨワシでなければ、フォルムは変わらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      nationalDex: 25,
      status: { currentHp: 100, maxHp: 100 },
    });

    // Act
    await effect.onEntry(get(1), context());

    // Assert
    expect(get(1).volatileState.form).toBeUndefined();
  });
});
