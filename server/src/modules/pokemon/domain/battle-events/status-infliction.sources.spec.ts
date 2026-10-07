import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { StaticEffect } from '../abilities/effects/stat-change/static-effect';
import { ToxicEffect } from '../moves/effects/toxic-effect';
import { FireFangEffect } from '../moves/effects/fire-fang-effect';
import { EffectSource } from './effect-source';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

/**
 * 状態異常を付与する基底クラスが、付与元を渡して canInflictStatus / inflictStatus を使うかを確かめる
 */
describe('状態異常を付与する効果と、付与のフック', () => {
  const onStatusInflicted = jest.fn<
    Promise<string | null>,
    [unknown, StatusCondition, EffectSource | undefined, unknown]
  >();

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    onStatusInflicted.mockReset().mockResolvedValue('synchronized!');
    AbilityRegistry.register('テストシンクロ', { onStatusInflicted });
    AbilityRegistry.register('テストふしょく', { bypassesStatusTypeImmunity: () => true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技の状態異常（どくどく）は、付与元として技と使用者を渡し、反応のメッセージを足す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'テストシンクロ' });

    // Act
    const message = await new ToxicEffect().onHit(
      get(1),
      get(2),
      context({ moveName: 'どくどく', attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.BadPoison);
    const source = onStatusInflicted.mock.calls[0][2];
    expect(source?.kind).toBe('move');
    expect(source?.name).toBe('どくどく');
    expect(source?.pokemon?.id).toBe(1);
    expect(message).toBe('was badly poisoned! synchronized!');
  });

  it('付与元の特性がタイプによる免疫を無視すれば、はがねタイプにも技でどくを付与できる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'テストふしょく' },
      { types: ['はがね'] },
    );

    // Act
    await new ToxicEffect().onHit(
      get(1),
      get(2),
      context({ attacker: get(1), attackerAbilityName: 'テストふしょく' }),
    );

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.BadPoison);
  });

  it('複数の状態異常を付与する技（ほのおのキバ）も、付与元を渡す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = createInMemoryBattle({}, { ability: 'テストシンクロ' });

    // Act
    await new FireFangEffect().onHit(get(1), get(2), context({ moveName: 'ほのおのキバ' }));

    // Assert
    expect(get(2).volatileState.flinched).toBe(true);
    expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    expect(onStatusInflicted.mock.calls[0][2]?.pokemon?.id).toBe(1);
  });

  it('接触時の特性（せいでんき）は、付与元として特性と持ち主を渡す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const { context, get } = createInMemoryBattle(
      { ability: 'テストシンクロ' },
      { ability: 'せいでんき' },
    );

    // Act
    const activated = await new StaticEffect().applyContactStatusCondition(
      get(2),
      get(1),
      context({
        moveName: 'たいあたり',
        moveCategory: 'Physical',
        attacker: get(1),
        defender: get(2),
        defenderAbilityName: 'せいでんき',
      }),
    );

    // Assert
    expect(activated).toBe(true);
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
    const source = onStatusInflicted.mock.calls[0][2];
    expect(source?.kind).toBe('ability');
    expect(source?.name).toBe('せいでんき');
    expect(source?.pokemon?.id).toBe(2);
  });
});
