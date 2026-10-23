import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { GrassyGlideEffect } from './grassy-glide-effect';

describe('GrassyGlideEffect（グラススライダー）', () => {
  const priorityOf = (params: {
    field: Field | null;
    typeNames?: readonly string[];
    abilityName?: string;
  }) => {
    const { context, get } = createInMemoryBattle();
    return new GrassyGlideEffect().modifyPriority(
      get(1),
      0,
      context({
        field: params.field,
        attackerTypeNames: params.typeNames ?? ['くさ'],
        attackerAbilityName: params.abilityName,
      }),
    );
  };

  it('グラスフィールドで地面にいれば、優先度を 1 上げる', () => {
    // Act
    const priority = priorityOf({ field: Field.GrassyTerrain });

    // Assert
    expect(priority).toBe(1);
  });

  it('グラスフィールドでなければ、優先度は変えない', () => {
    // Act
    const priority = priorityOf({ field: Field.ElectricTerrain });

    // Assert
    expect(priority).toBeUndefined();
  });

  it('ひこうタイプは地面にいないので、優先度は変えない', () => {
    // Act
    const priority = priorityOf({ field: Field.GrassyTerrain, typeNames: ['くさ', 'ひこう'] });

    // Assert
    expect(priority).toBeUndefined();
  });

  it('ふゆうは地面にいないので、優先度は変えない', () => {
    // Act
    const priority = priorityOf({ field: Field.GrassyTerrain, abilityName: 'ふゆう' });

    // Assert
    expect(priority).toBeUndefined();
  });
});
