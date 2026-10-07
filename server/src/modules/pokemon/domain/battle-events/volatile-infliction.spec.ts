import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { AbilityRegistry } from '../abilities/ability-registry';
import { MoldBreakerEffect } from '../abilities/effects/mold-breaker-effect';
import { EffectSource } from './effect-source';
import { canApplyVolatile, tryApplyVolatile } from './volatile-infliction';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('一時的な状態の付与（canApplyVolatile / tryApplyVolatile）', () => {
  const byMove = (abilityName?: string): EffectSource => ({
    kind: 'move',
    name: 'ちょうはつ',
    abilityName,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('何の状態もなければ付与して、patch を書き込む', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const applied = await tryApplyVolatile(get(2), 'taunt', { tauntTurns: 3 }, context(), {
      source: { ...byMove(), pokemon: get(1) },
    });

    // Assert
    expect(applied).toBe(true);
    expect(get(2).volatileState.tauntTurns).toBe(3);
  });

  it('すでにその状態なら付与しない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { tauntTurns: 1 } } },
    );

    // Act
    const applied = await tryApplyVolatile(get(2), 'taunt', { tauntTurns: 3 }, context());

    // Assert
    expect(applied).toBe(false);
    expect(get(2).volatileState.tauntTurns).toBe(1);
  });

  it('きあいだめ（focusEnergy）は、critStageBoost があれば付与しない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { status: { volatileState: { critStageBoost: 2 } } },
    );

    // Act
    const applied = await tryApplyVolatile(get(2), 'focusEnergy', { critStageBoost: 2 }, context());

    // Assert
    expect(applied).toBe(false);
  });

  it('ひんしのポケモンには付与しない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { status: { currentHp: 0 } });

    // Act
    const result = await canApplyVolatile(get(2), 'leechSeed', context());

    // Assert
    expect(result).toBe(false);
  });

  it('くさタイプにはやどりぎのタネを付与できない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['くさ'] });

    // Act
    const result = await canApplyVolatile(get(2), 'leechSeed', context());

    // Assert
    expect(result).toBe(false);
  });

  it('対象の特性の canReceiveVolatile が false なら付与できず、種類と付与元を渡す', async () => {
    // Arrange
    const canReceiveVolatile = jest.fn().mockReturnValue(false);
    AbilityRegistry.register('テストアロマベール', { canReceiveVolatile });
    const { context, get } = createInMemoryBattle({}, { ability: 'テストアロマベール' });
    const source = { ...byMove(), pokemon: get(1) };

    // Act
    const result = await canApplyVolatile(get(2), 'taunt', context(), { source });

    // Assert
    expect(result).toBe(false);
    expect(canReceiveVolatile).toHaveBeenCalledWith(get(2), 'taunt', expect.anything(), source);
  });

  it('相手の技で付与するとき、付与元がかたやぶりなら対象の特性を無視する', async () => {
    // Arrange
    AbilityRegistry.register('テストアロマベール', { canReceiveVolatile: () => false });
    AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
    const { context, get } = createInMemoryBattle(
      { ability: 'テストかたやぶり' },
      { ability: 'テストアロマベール' },
    );

    // Act
    const result = await canApplyVolatile(get(2), 'taunt', context(), {
      source: { ...byMove('テストかたやぶり'), pokemon: get(1) },
    });

    // Assert
    expect(result).toBe(true);
  });

  describe('あくび', () => {
    it('状態異常があれば付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        {},
        { status: { statusCondition: StatusCondition.Paralysis } },
      );

      // Act
      const result = await canApplyVolatile(get(2), 'yawn', context());

      // Assert
      expect(result).toBe(false);
    });

    it('ねむりを防ぐ特性（ふみん）には付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { ability: 'ふみん' });

      // Act
      const result = await canApplyVolatile(get(2), 'yawn', context());

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('メロメロ', () => {
    it('付与元と性別が違えば付与できる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { gender: Gender.Female });

      // Act
      const result = await canApplyVolatile(get(2), 'attract', context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(true);
    });

    it('どちらかが性別不明なら付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({}, { gender: Gender.Genderless });

      // Act
      const result = await canApplyVolatile(get(2), 'attract', context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('付与元と性別が同じなら付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = await canApplyVolatile(get(2), 'attract', context(), {
        source: { ...byMove(), pokemon: get(1) },
      });

      // Assert
      expect(result).toBe(false);
    });

    it('付与元がわからなければ付与できない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = await canApplyVolatile(get(2), 'attract', context());

      // Assert
      expect(result).toBe(false);
    });
  });
});
