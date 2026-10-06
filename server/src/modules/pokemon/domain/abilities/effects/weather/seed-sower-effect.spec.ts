import { SeedSowerEffect } from './seed-sower-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Battle, Field } from '@/modules/battle/domain/entities/battle.entity';

describe('SeedSowerEffect（こぼれダネ）', () => {
  const hit = (overrides: Partial<HitResult> = {}): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
    ...overrides,
  });

  const withField = (battle: Battle, field: Field | null): Battle =>
    new Battle(
      battle.id,
      battle.trainer1Id,
      battle.trainer2Id,
      battle.team1Id,
      battle.team2Id,
      battle.turn,
      battle.weather,
      field,
      battle.status,
      battle.winnerTrainerId,
    );

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('レジストリに こぼれダネ として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('こぼれダネ');

    // Assert
    expect(effect).toBeInstanceOf(SeedSowerEffect);
  });

  describe('onDamagingHit', () => {
    it('ダメージを受けたら、グラスフィールドにする', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'こぼれダネ', status: { currentHp: 70 } },
      );

      // Act
      const message = await new SeedSowerEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      expect(battleRepository.update).toHaveBeenCalledWith(1, { field: Field.GrassyTerrain });
      expect(message).toBe('Grassy Terrain was set up!');
    });

    it('別のフィールドなら、グラスフィールドに書き換える', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'こぼれダネ' },
      );
      const battle = withField(context().battle, Field.ElectricTerrain);

      // Act
      const message = await new SeedSowerEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ battle }),
      );

      // Assert
      expect(battleRepository.update).toHaveBeenCalledWith(1, { field: Field.GrassyTerrain });
      expect(message).toBe('Grassy Terrain was set up!');
    });

    it('すでにグラスフィールドなら、何もしない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'こぼれダネ' },
      );
      const battle = withField(context().battle, Field.GrassyTerrain);

      // Act
      const message = await new SeedSowerEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ battle }),
      );

      // Assert
      expect(battleRepository.update).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });

    it('連続技の前のヒットでグラスフィールドにしていたら、もう一度は張らない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'こぼれダネ' },
      );
      battleRepository.findById.mockResolvedValue(withField(context().battle, Field.GrassyTerrain));

      // Act
      const message = await new SeedSowerEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ hitIndex: 1, hitCount: 2 }),
        context(),
      );

      // Assert
      expect(battleRepository.update).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });

    it('ひんしになったヒットでも、グラスフィールドにする', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'こぼれダネ', status: { currentHp: 0 } },
      );

      // Act
      const message = await new SeedSowerEffect().onDamagingHit(
        get(2),
        get(1),
        hit({ targetFainted: true }),
        context(),
      );

      // Assert
      expect(battleRepository.update).toHaveBeenCalledWith(1, { field: Field.GrassyTerrain });
      expect(message).toBe('Grassy Terrain was set up!');
    });
  });
});
