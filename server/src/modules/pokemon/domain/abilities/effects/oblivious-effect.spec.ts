import { ObliviousEffect } from './oblivious-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../ability-registry';
import { canApplyVolatile } from '../../battle-events/volatile-infliction';
import { canInflictStatus } from '../../battle-events/status-infliction';
import { applyStatChanges } from '../../battle-events/stat-change';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

describe('ObliviousEffect（どんかん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('どんかんとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('どんかん');

    // Assert
    expect(effect).toBeInstanceOf(ObliviousEffect);
  });

  it('メロメロにならない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { gender: Gender.Male },
      { ability: 'どんかん', gender: Gender.Female },
    );

    // Act
    const result = await canApplyVolatile(get(2), 'attract', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'メロメロ' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('ちょうはつを受けない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'どんかん' });

    // Act
    const result = await canApplyVolatile(get(2), 'taunt', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'ちょうはつ' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('かたやぶりの技では、ちょうはつを受ける', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かたやぶり' },
      { ability: 'どんかん' },
    );

    // Act
    const result = await canApplyVolatile(get(2), 'taunt', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'ちょうはつ' },
    });

    // Assert
    expect(result).toBe(true);
  });

  it('アンコールなど、ほかの一時的な状態は受ける', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'どんかん' });

    // Act
    const result = await canApplyVolatile(get(2), 'encore', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'アンコール' },
    });

    // Assert
    expect(result).toBe(true);
  });

  it('ねむりにはなる（第 9 世代のどんかんは、ねむりを防がない）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'どんかん' });

    // Act
    const result = await canInflictStatus(get(2), StatusCondition.Sleep, context());

    // Assert
    expect(result).toBe(true);
  });

  it('いかくで攻撃が下がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'どんかん' });

    // Act
    const result = await applyStatChanges(
      get(2),
      [{ statType: 'attack', rankChange: -1 }],
      context(),
      { source: { pokemon: get(1), kind: 'ability', name: 'いかく' } },
    );

    // Assert
    expect(result.applied).toEqual([]);
    expect(get(2).attackRank).toBe(0);
  });
});
