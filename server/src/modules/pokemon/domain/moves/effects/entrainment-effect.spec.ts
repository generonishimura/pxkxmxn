import { EntrainmentEffect } from './entrainment-effect';
import { MoveRegistry } from '../move-registry';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('EntrainmentEffect（なかまづくり）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('なかまづくり として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('なかまづくり');

    // Assert
    expect(effect).toBeInstanceOf(EntrainmentEffect);
  });

  it('相手の特性を、使用者の今の特性に書き換える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'たんじゅん' }, { ability: 'ふみん' });

    // Act
    const message = await new EntrainmentEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.abilityOverride).toBe('たんじゅん');
    expect(message).toBe("The target's ability became たんじゅん!");
  });

  it('使用者の特性が上書きされていれば、上書きされた特性を写す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん', status: { volatileState: { abilityOverride: 'たんじゅん' } } },
      { ability: 'いかく' },
    );

    // Act
    await new EntrainmentEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.abilityOverride).toBe('たんじゅん');
  });

  it('受け取った特性が場に出たときの特性なら発動する（いかく）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'いかく' }, { ability: 'ふみん' });

    // Act
    await new EntrainmentEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.abilityOverride).toBe('いかく');
    expect(get(1).attackRank).toBe(-1);
  });

  it.each([
    ['相手が同じ特性', 'たんじゅん', 'たんじゅん'],
    ['相手の特性が消せない特性（バトルスイッチ）', 'たんじゅん', 'バトルスイッチ'],
    ['相手の特性がなまけ', 'たんじゅん', 'なまけ'],
    ['使用者の特性がなかまづくりで写せない特性（トレース）', 'トレース', 'ふみん'],
  ])('%s なら失敗する', async (_label, userAbility, targetAbility) => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: userAbility },
      { ability: targetAbility },
    );

    // Act
    const message = await new EntrainmentEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
  });

  it('使用者に特性がなければ失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'ふみん' });

    // Act
    const message = await new EntrainmentEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
