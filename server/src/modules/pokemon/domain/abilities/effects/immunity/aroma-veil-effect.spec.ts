import { AromaVeilEffect } from './aroma-veil-effect';
import { AbilityRegistry } from '../../ability-registry';
import { canApplyVolatile, VolatileKind } from '../../../battle-events/volatile-infliction';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

describe('AromaVeilEffect（アロマベール）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('アロマベールとして登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('アロマベール');

    // Assert
    expect(effect).toBeInstanceOf(AromaVeilEffect);
  });

  it.each<[VolatileKind, string]>([
    ['taunt', 'ちょうはつ'],
    ['encore', 'アンコール'],
    ['disable', 'かなしばり'],
    ['torment', 'いちゃもん'],
    ['healBlock', 'かいふくふうじ'],
  ])('%s（%s）を受けない', async (kind, moveName) => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'アロマベール' });

    // Act
    const result = await canApplyVolatile(get(2), kind, context(), {
      source: { pokemon: get(1), kind: 'move', name: moveName },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('異性からのメロメロを受けない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { gender: Gender.Male },
      { ability: 'アロマベール', gender: Gender.Female },
    );

    // Act
    const result = await canApplyVolatile(get(2), 'attract', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'メロメロ' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('のろわれボディのかなしばりも受けない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'アロマベール' },
      { ability: 'のろわれボディ' },
    );

    // Act
    const result = await canApplyVolatile(get(1), 'disable', context(), {
      source: { pokemon: get(2), kind: 'ability', name: 'のろわれボディ' },
    });

    // Assert
    expect(result).toBe(false);
  });

  it('かたやぶりの技では、ちょうはつを受ける', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かたやぶり' },
      { ability: 'アロマベール' },
    );

    // Act
    const result = await canApplyVolatile(get(2), 'taunt', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'ちょうはつ' },
    });

    // Assert
    expect(result).toBe(true);
  });

  it('やどりぎのタネなど、ほかの一時的な状態は受ける', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'アロマベール' });

    // Act
    const result = await canApplyVolatile(get(2), 'leechSeed', context(), {
      source: { pokemon: get(1), kind: 'move', name: 'やどりぎのタネ' },
    });

    // Assert
    expect(result).toBe(true);
  });
});
