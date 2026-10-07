import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { ProteanEffect } from './protean-effect';

describe('ProteanEffect（へんげんじざい）', () => {
  it('技を出す直前に、使用者のタイプを技のタイプだけにし、使ったことを記録する', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['みず', 'あく'] });

    // Act
    const message = await new ProteanEffect().onPrepareHit(
      battle.get(1),
      battle.get(2),
      battle.context({ moveTypeName: 'みず' }),
    );

    // Assert
    expect(message).toBe('became the みず type!');
    expect(battle.get(1).volatileState.typeOverride).toEqual(['みず']);
    expect(battle.get(1).volatileState.typeChangeAbilityUsed).toBe(true);
  });

  it('場に出てからすでに使っていれば、タイプは変わらない', async () => {
    // Arrange
    const battle = createInMemoryBattle({
      types: ['みず'],
      status: { volatileState: { typeChangeAbilityUsed: true } },
    });

    // Act
    const message = await new ProteanEffect().onPrepareHit(
      battle.get(1),
      battle.get(2),
      battle.context({ moveTypeName: 'くさ' }),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
  });

  it('今のタイプが技のタイプだけなら、タイプは変わらず、使ったことも記録しない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['みず'] });

    // Act
    const message = await new ProteanEffect().onPrepareHit(
      battle.get(1),
      battle.get(2),
      battle.context({ moveTypeName: 'みず' }),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.get(1).volatileState.typeChangeAbilityUsed).toBeUndefined();
  });

  it.each([undefined, '???'])('タイプなしの技（%s）では、タイプは変わらない', async typeName => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['みず'] });

    // Act
    const message = await new ProteanEffect().onPrepareHit(
      battle.get(1),
      battle.get(2),
      battle.context({ moveTypeName: typeName }),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });

  it('タイプを変えられないとき（アルセウス）は、使ったことを記録しない', async () => {
    // Arrange
    const battle = createInMemoryBattle({ types: ['ノーマル'], nationalDex: 493 });

    // Act
    const message = await new ProteanEffect().onPrepareHit(
      battle.get(1),
      battle.get(2),
      battle.context({ moveTypeName: 'でんき' }),
    );

    // Assert
    expect(message).toBeNull();
    expect(battle.get(1).volatileState.typeChangeAbilityUsed).toBeUndefined();
  });
});
