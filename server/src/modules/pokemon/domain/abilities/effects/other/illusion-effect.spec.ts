import { IllusionEffect } from './illusion-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('IllusionEffect（イリュージョン）', () => {
  const hit: HitResult = {
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  };

  /** トレーナー1 の控え（ID 3 以降） */
  const benched = (id: number, currentHp = 100): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, 1, false, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('イリュージョン として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('イリュージョン');

    // Assert
    expect(effect).toBeInstanceOf(IllusionEffect);
  });

  describe('onEntry', () => {
    it('手持ちの後ろから見て、ひんしでない最初のポケモンに化ける', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'イリュージョン' });
      battle.statuses.set(3, benched(3));
      battle.statuses.set(4, benched(4, 0));

      // Act
      await new IllusionEffect().onEntry(battle.get(1), battle.context());

      // Assert
      expect(battle.get(1).volatileState.illusionStatusId).toBe(3);
    });

    it('自分が手持ちの最後なら化けない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'イリュージョン' });

      // Act
      await new IllusionEffect().onEntry(battle.get(1), battle.context());

      // Assert
      expect(battle.get(1).volatileState.illusionStatusId).toBeUndefined();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'イリュージョン' });
      battle.statuses.set(3, benched(3));

      // Act
      await new IllusionEffect().onEntry(battle.get(1));

      // Assert
      expect(battle.get(1).volatileState.illusionStatusId).toBeUndefined();
    });
  });

  describe('onDamagingHit', () => {
    it('化けている間にダメージを受けると、イリュージョンが解ける', async () => {
      // Arrange
      const battle = createInMemoryBattle({
        ability: 'イリュージョン',
        status: { volatileState: { illusionStatusId: 3 } },
      });

      // Act
      const message = await new IllusionEffect().onDamagingHit(
        battle.get(1),
        battle.get(2),
        hit,
        battle.context(),
      );

      // Assert
      expect(battle.get(1).volatileState.illusionStatusId).toBeUndefined();
      expect(message).toBe('The illusion wore off!');
    });

    it('化けていなければ何もしない', async () => {
      // Arrange
      const battle = createInMemoryBattle({ ability: 'イリュージョン' });

      // Act
      const message = await new IllusionEffect().onDamagingHit(
        battle.get(1),
        battle.get(2),
        hit,
        battle.context(),
      );

      // Assert
      expect(message).toBeNull();
      expect(battle.battleRepository.patchVolatileState).not.toHaveBeenCalled();
    });
  });
});
