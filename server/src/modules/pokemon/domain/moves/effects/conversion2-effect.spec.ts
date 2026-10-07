import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Type } from '../../entities/type.entity';
import { ITypeEffectivenessRepository } from '../../pokemon.repository.interface';
import { Conversion2Effect } from './conversion2-effect';

/**
 * でんき技を、くさ・でんき・ドラゴンが半減し、じめんが無効にするタイプ相性
 */
const typeEffectivenessRepository = (): ITypeEffectivenessRepository => {
  const names = ['でんき', 'くさ', 'じめん', 'ドラゴン', 'みず'];
  const types = names.map((name, index) => new Type(index + 1, name, name));
  return {
    getTypeEffectivenessMap: () =>
      Promise.resolve(
        new Map([
          ['1-1', 0.5],
          ['1-2', 0.5],
          ['1-3', 0],
          ['1-4', 0.5],
          ['1-5', 2],
        ]),
      ),
    findTypeByName: name => Promise.resolve(types.find(type => type.name === name) ?? null),
  };
};

describe('Conversion2Effect（テクスチャー２）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('相手が最後に使った技を半減以下にするタイプから、ランダムに 1 つ選んで変わる', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const battle = createInMemoryBattle(
      { types: ['ノーマル'] },
      { status: { volatileState: { lastMoveTypeName: 'でんき' } } },
    );
    const context = battle.context({ typeEffectivenessRepository: typeEffectivenessRepository() });

    // Act
    const message = await new Conversion2Effect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('transformed into the ドラゴン type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['ドラゴン']);
  });

  it('使用者がもう持っているタイプは選ばない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const battle = createInMemoryBattle(
      { types: ['でんき', 'くさ'] },
      { status: { volatileState: { lastMoveTypeName: 'でんき' } } },
    );
    const context = battle.context({ typeEffectivenessRepository: typeEffectivenessRepository() });

    // Act
    const message = await new Conversion2Effect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('transformed into the じめん type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['じめん']);
  });

  it('相手がまだ技を使っていなければ失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle();
    const context = battle.context({ typeEffectivenessRepository: typeEffectivenessRepository() });

    // Act
    const message = await new Conversion2Effect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it('半減以下にするタイプをすべて持っていれば失敗する', async () => {
    // Arrange: でんきを半減以下にするのは、でんき・くさ・じめん・ドラゴン
    const battle = createInMemoryBattle(
      {
        types: ['ノーマル'],
        status: {
          volatileState: { typeOverride: ['でんき', 'くさ', 'じめん'], addedType: 'ドラゴン' },
        },
      },
      { status: { volatileState: { lastMoveTypeName: 'でんき' } } },
    );
    const context = battle.context({ typeEffectivenessRepository: typeEffectivenessRepository() });

    // Act
    const message = await new Conversion2Effect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['でんき', 'くさ', 'じめん']);
  });

  it.each([
    ['アルセウス', 493],
    ['シルヴァディ', 773],
  ])('%s のタイプは変えられず失敗する', async (_name, nationalDex) => {
    // Arrange
    const battle = createInMemoryBattle(
      { types: ['ノーマル'], nationalDex },
      { status: { volatileState: { lastMoveTypeName: 'でんき' } } },
    );
    const context = battle.context({ typeEffectivenessRepository: typeEffectivenessRepository() });

    // Act
    const message = await new Conversion2Effect().onUse(battle.get(1), battle.get(2), context);

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });
});
