import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { ToxicDebrisEffect } from './toxic-debris-effect';

describe('ToxicDebrisEffect（どくげしょう）', () => {
  const hit = (
    moveCategory: HitResult['moveCategory'] = 'Physical',
    targetFainted = false,
  ): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory,
    targetFainted,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('どくげしょう として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('どくげしょう');

    // Assert
    expect(effect).toBeInstanceOf(ToxicDebrisEffect);
  });

  describe('onDamagingHit', () => {
    it('物理技を受けたら、攻撃した相手の陣営にどくびしを 1 層置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'どくげしょう' },
      );

      // Act
      const message = await new ToxicDebrisEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1).toxicSpikesLayers).toBe(1);
      expect(getSideConditions(battle.sideState, 2).toxicSpikesLayers).toBeUndefined();
      expect(message).toBe(
        'Poison spikes were scattered on the ground all around the opposing team!',
      );
    });

    it('1 層あれば 2 層に重ねる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'どくげしょう' },
      );
      await battleRepository.patchSideConditions(1, 1, { toxicSpikesLayers: 1 });

      // Act
      await new ToxicDebrisEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1).toxicSpikesLayers).toBe(2);
    });

    it('2 層あれば何もしない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'どくげしょう' },
      );
      await battleRepository.patchSideConditions(1, 1, { toxicSpikesLayers: 2 });

      // Act
      const message = await new ToxicDebrisEffect().onDamagingHit(get(2), get(1), hit(), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1).toxicSpikesLayers).toBe(2);
      expect(message).toBeNull();
    });

    it('自分がひんしになったヒットでも、どくびしを置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'どくげしょう', status: { currentHp: 0 } },
      );

      // Act
      await new ToxicDebrisEffect().onDamagingHit(get(2), get(1), hit('Physical', true), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 1).toxicSpikesLayers).toBe(1);
    });

    it('特殊技を受けたときは何もしない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'どくげしょう' },
      );

      // Act
      const message = await new ToxicDebrisEffect().onDamagingHit(
        get(2),
        get(1),
        hit('Special'),
        context(),
      );

      // Assert
      expect(battleRepository.patchSideConditions).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const { get, battleRepository } = createInMemoryBattle({}, { ability: 'どくげしょう' });

      // Act
      const message = await new ToxicDebrisEffect().onDamagingHit(get(2), get(1), hit());

      // Assert
      expect(battleRepository.patchSideConditions).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });
  });
});
