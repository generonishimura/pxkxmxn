import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { resolveTypeNames } from '../../battle-events/battle-traits';
import { TrickOrTreatEffect } from './trick-or-treat-effect';
import { ForestsCurseEffect } from './forests-curse-effect';

describe('3 つめのタイプを足す技', () => {
  describe('TrickOrTreatEffect（ハロウィン）', () => {
    it('相手に 3 つめのタイプとしてゴーストを足す', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['みず', 'じめん'] });

      // Act
      const result = await new TrickOrTreatEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('The Ghost type was added to the target!');
      expect(await resolveTypeNames(battle.get(2), battle.context())).toEqual([
        'みず',
        'じめん',
        'ゴースト',
      ]);
    });

    it('もりののろいで足したくさタイプを置き換える', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        {},
        { types: ['みず'], status: { volatileState: { addedType: 'くさ' } } },
      );

      // Act
      await new TrickOrTreatEffect().onUse(battle.get(1), battle.get(2), battle.context());

      // Assert
      expect(battle.get(2).volatileState.addedType).toBe('ゴースト');
    });

    it('相手がすでにゴーストタイプなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['ゴースト', 'どく'] });

      // Act
      const result = await new TrickOrTreatEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(2).volatileState.addedType).toBeUndefined();
    });
  });

  describe('ForestsCurseEffect（もりののろい）', () => {
    it('相手に 3 つめのタイプとしてくさを足す', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['みず'] });

      // Act
      const result = await new ForestsCurseEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('The Grass type was added to the target!');
      expect(await resolveTypeNames(battle.get(2), battle.context())).toEqual(['みず', 'くさ']);
    });

    it('相手がハロウィンでゴーストを足されていても、すでにくさタイプなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle(
        {},
        { types: ['くさ'], status: { volatileState: { addedType: 'ゴースト' } } },
      );

      // Act
      const result = await new ForestsCurseEffect().onUse(
        battle.get(1),
        battle.get(2),
        battle.context(),
      );

      // Assert
      expect(result).toBe('But it failed');
      expect(battle.get(2).volatileState.addedType).toBe('ゴースト');
    });

    it('相手がひんしなら失敗する', async () => {
      // Arrange
      const battle = createInMemoryBattle({}, { types: ['みず'], status: { currentHp: 0 } });

      // Act
      const result = await new ForestsCurseEffect().onUse(
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
      ['ハロウィン', TrickOrTreatEffect],
      ['もりののろい', ForestsCurseEffect],
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
