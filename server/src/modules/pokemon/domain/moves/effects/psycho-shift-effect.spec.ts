import { PsychoShiftEffect } from './psycho-shift-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoldBreakerEffect } from '../../abilities/effects/mold-breaker-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('PsychoShiftEffect（サイコシフト）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('自分の状態異常を相手に移し、自分の状態異常を治す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { statusCondition: StatusCondition.Paralysis },
    });

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBe('The user transferred its status condition to the target!');
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(get(1).statusCondition).toBe(StatusCondition.None);
  });

  it('自分に状態異常がなければ何もしない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBeNull();
    expect(get(2).statusCondition).toBeNull();
  });

  it('相手がすでに状態異常なら失敗し、自分の状態異常も治らない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Paralysis } },
      { status: { statusCondition: StatusCondition.Burn } },
    );

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBeNull();
    expect(get(2).statusCondition).toBe(StatusCondition.Burn);
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('相手のタイプで防がれる状態異常（でんきタイプへのまひ）は移せず、自分の状態異常も治らない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Paralysis } },
      { types: ['でんき'] },
    );

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBeNull();
    expect(get(2).statusCondition).toBeNull();
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('相手の特性で防がれる状態異常は移せない', async () => {
    // Arrange
    AbilityRegistry.register('テストじゅうなん', { canReceiveStatusCondition: () => false });
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Paralysis } },
      { ability: 'テストじゅうなん' },
    );

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBeNull();
    expect(get(2).statusCondition).toBeNull();
    expect(get(1).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('使用者がかたやぶりなら、相手の状態異常を防ぐ特性を無視する', async () => {
    // Arrange
    AbilityRegistry.register('テストじゅうなん', { canReceiveStatusCondition: () => false });
    AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
    const { context, get } = createInMemoryBattle(
      { ability: 'テストかたやぶり', status: { statusCondition: StatusCondition.Paralysis } },
      { ability: 'テストじゅうなん' },
    );

    // Act
    await new PsychoShiftEffect().onUse(
      get(1),
      get(2),
      context({ attackerAbilityName: 'テストかたやぶり' }),
    );

    // Assert
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(get(1).statusCondition).toBe(StatusCondition.None);
  });

  it('移したら、付与された側の特性に技と使用者を付与元として渡し、メッセージを足す', async () => {
    // Arrange
    const onStatusInflicted = jest.fn().mockResolvedValue('Test ability activated!');
    AbilityRegistry.register('テストシンクロ', { onStatusInflicted });
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Burn } },
      { ability: 'テストシンクロ' },
    );

    // Act
    const result = await new PsychoShiftEffect().onUse(
      get(1),
      get(2),
      context({ moveName: 'サイコシフト' }),
    );

    // Assert
    expect(result).toBe(
      'The user transferred its status condition to the target! Test ability activated!',
    );
    const source = onStatusInflicted.mock.calls[0][2];
    expect(source).toEqual(expect.objectContaining({ kind: 'move', name: 'サイコシフト' }));
    expect(source.pokemon.id).toBe(1);
  });

  it('相手がシンクロでも、移した時点では使用者がまだ状態異常なのでうつし返されず、使用者は治る（本家と同じ）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { statusCondition: StatusCondition.Paralysis } },
      { ability: 'シンクロ' },
    );

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), context());

    // Assert
    expect(result).toBe('The user transferred its status condition to the target!');
    expect(get(2).statusCondition).toBe(StatusCondition.Paralysis);
    expect(get(1).statusCondition).toBe(StatusCondition.None);
  });

  it('battleRepository が無い場合は null', async () => {
    // Arrange
    const { get } = createInMemoryBattle({
      status: { statusCondition: StatusCondition.Paralysis },
    });
    const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

    // Act
    const result = await new PsychoShiftEffect().onUse(get(1), get(2), { battle });

    // Assert
    expect(result).toBeNull();
  });
});
