import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { CamouflageEffect } from './camouflage-effect';

describe('CamouflageEffect（ほごしょく）', () => {
  it.each([
    [Field.ElectricTerrain, 'でんき'],
    [Field.GrassyTerrain, 'くさ'],
    [Field.MistyTerrain, 'フェアリー'],
    [Field.PsychicTerrain, 'エスパー'],
  ])('フィールドが %s なら %s タイプになる', async (field, typeName) => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['みず'] });
    await battle.battleRepository.update(1, { field });

    // Act
    const message = await new CamouflageEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(message).toBe(`became the ${typeName} type!`);
    expect(battle.get(1).volatileState.typeOverride).toEqual([typeName]);
  });

  it('フィールドがなければノーマルタイプになり、足されたタイプは消える', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      types: ['みず'],
      status: { volatileState: { addedType: 'ゴースト' } },
    });

    // Act
    const message = await new CamouflageEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(message).toBe('became the ノーマル type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['ノーマル']);
    expect(battle.get(1).volatileState.addedType).toBeUndefined();
  });

  it('すでにそのタイプだけなら失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'] });

    // Act
    const message = await new CamouflageEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('2 つめのタイプがあれば、フィールドのタイプだけになる', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル', 'ひこう'] });

    // Act
    const message = await new CamouflageEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(message).toBe('became the ノーマル type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['ノーマル']);
  });

  it('アルセウスはタイプを変えられず、失敗する', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['みず'], nationalDex: 493 });

    // Act
    const message = await new CamouflageEffect().onUse(
      battle.get(1),
      battle.get(2),
      battle.context(),
    );

    // Assert
    expect(message).toBe('But it failed');
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });
});
