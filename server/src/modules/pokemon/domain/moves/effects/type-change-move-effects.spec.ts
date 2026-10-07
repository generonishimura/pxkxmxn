import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { ReflectTypeEffect } from './reflect-type-effect';
import { MagicPowderEffect } from './magic-powder-effect';

describe('タイプを書き換える技', () => {
  describe('ReflectTypeEffect（ミラータイプ）', () => {
    it('使用者のタイプが相手のタイプと同じになる', async () => {
      // Arrange
      const battle = createInMemoryBattle({ types: ['ノーマル'] }, { types: ['みず', 'じめん'] });

      // Act
      const result = await new ReflectTypeEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe("The user's type became the same as the target's type!");
      expect(await resolveTypeNames(battle.get(1), battle.context())).toEqual(['みず', 'じめん']);
    });

    it('相手の 3 つめのタイプ（addedType）も写す', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['ノーマル'], status: { volatileState: { addedType: 'くさ' } } },
        { types: ['みず'], status: { volatileState: { addedType: 'ゴースト' } } },
      );

      // Act
      await new ReflectTypeEffect().onUse(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(battle.get(1).volatileState).toEqual({
        typeOverride: ['みず'],
        addedType: 'ゴースト',
      });
    });

    it('相手に 3 つめのタイプがなければ、使用者の 3 つめのタイプは消える', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['ノーマル'], status: { volatileState: { addedType: 'くさ' } } },
        { types: ['みず'] },
      );

      // Act
      await new ReflectTypeEffect().onUse(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(battle.get(1).volatileState).toEqual({ typeOverride: ['みず'] });
    });

    it('相手のタイプなし（???）は写さない', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['ノーマル'] },
        { types: ['ほのお'], status: { volatileState: { typeOverride: ['???', 'ひこう'] } } },
      );

      // Act
      await new ReflectTypeEffect().onUse(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(battle.get(1).volatileState.typeOverride).toEqual(['ひこう']);
    });

    it('相手がタイプなしだけで 3 つめのタイプがあれば、ノーマルと 3 つめのタイプになる', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['でんき'] },
        {
          types: ['ほのお'],
          status: { volatileState: { typeOverride: ['???'], addedType: 'くさ' } },
        },
      );

      // Act
      const result = await new ReflectTypeEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe("The user's type became the same as the target's type!");
      expect(battle.get(1).volatileState).toEqual({
        typeOverride: ['ノーマル'],
        addedType: 'くさ',
      });
    });

    it('相手がタイプなしだけで 3 つめのタイプもなければ失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['でんき'] },
        { types: ['ほのお'], status: { volatileState: { typeOverride: ['???'] } } },
      );

      // Act
      const result = await new ReflectTypeEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
    });

    it('使用者がアルセウスなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        { types: ['ノーマル'], nationalDex: 493 },
        { types: ['みず'] },
      );

      // Act
      const result = await new ReflectTypeEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(1).volatileState.typeOverride).toBeUndefined();
    });
  });

  describe('MagicPowderEffect（まほうのこな）', () => {
    it('相手のタイプがエスパーだけになり、3 つめのタイプは消える', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        {},
        { types: ['みず', 'じめん'], status: { volatileState: { addedType: 'ゴースト' } } },
      );

      // Act
      const result = await new MagicPowderEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('The target transformed into the エスパー type!');
      expect(battle.get(2).volatileState).toEqual({ typeOverride: ['エスパー'] });
    });

    it('相手がすでにエスパーだけなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['エスパー'] });

      // Act
      const result = await new MagicPowderEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(2).volatileState.typeOverride).toBeUndefined();
    });

    it('エスパーと 3 つめのタイプを持つ相手には成功する（本家は getTypes() を見る）', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        {},
        { types: ['エスパー'], status: { volatileState: { addedType: 'ゴースト' } } },
      );

      // Act
      const result = await new MagicPowderEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('The target transformed into the エスパー type!');
      expect(battle.get(2).volatileState).toEqual({ typeOverride: ['エスパー'] });
    });

    it('粉技なので、くさタイプの相手には効かない', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['くさ', 'どく'] });

      // Act
      const result = await new MagicPowderEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(2).volatileState.typeOverride).toBeUndefined();
    });

    it('相手がシルヴァディなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['ノーマル'], nationalDex: 773 });

      // Act
      const result = await new MagicPowderEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
    });
  });

  describe('登録', () => {
    it.each([
      ['ミラータイプ', ReflectTypeEffect],
      ['まほうのこな', MagicPowderEffect],
    ])('「%s」が登録されている', (moveName, effectClass) => {
      // Arrange
      MoveRegistry.clear();
      MoveRegistry.initialize();

      // Act
      const effect = MoveRegistry.get(moveName);

      // Assert
      expect(effect).toBeInstanceOf(effectClass);
    });
  });
});
