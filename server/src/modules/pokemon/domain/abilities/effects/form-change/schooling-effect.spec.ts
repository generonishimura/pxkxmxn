import { SchoolingEffect } from './schooling-effect';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

describe('SchoolingEffect（ぎょぐん）', () => {
  const WISHIWASHI = 746;
  const effect = new SchoolingEffect();

  /** レベルだけを変えた育成済みポケモン */
  const withLevel = (pokemon: TrainedPokemon, level: number): TrainedPokemon =>
    new TrainedPokemon(
      pokemon.id,
      pokemon.trainerId,
      pokemon.pokemon,
      pokemon.nickname,
      level,
      pokemon.gender,
      pokemon.nature,
      pokemon.ability,
      pokemon.ivHp,
      pokemon.ivAttack,
      pokemon.ivDefense,
      pokemon.ivSpecialAttack,
      pokemon.ivSpecialDefense,
      pokemon.ivSpeed,
      pokemon.evHp,
      pokemon.evAttack,
      pokemon.evDefense,
      pokemon.evSpecialAttack,
      pokemon.evSpecialDefense,
      pokemon.evSpeed,
    );

  /** トレーナー1 のヨワシのレベルを変える */
  const setLevel = async (
    battle: ReturnType<typeof createInMemoryBattle>,
    level: number,
  ): Promise<void> => {
    const original = (await battle.trainedPokemonRepository.findById(1))!;
    const leveled = withLevel(original, level);
    battle.trainedPokemonRepository.findById.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? leveled : null),
    );
  };

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

  it('レベル 20 なら、むれたすがたになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 100, maxHp: 100 },
    });
    await setLevel(battle, 20);

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBe('school');
  });

  it('レベル 19 なら、むれたすがたにならない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      nationalDex: WISHIWASHI,
      status: { currentHp: 100, maxHp: 100 },
    });
    await setLevel(battle, 19);

    // Act
    await effect.onEntry(battle.get(1), battle.context());

    // Assert
    expect(battle.get(1).volatileState.form).toBeUndefined();
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
