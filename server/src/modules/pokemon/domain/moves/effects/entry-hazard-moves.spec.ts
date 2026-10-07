import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { SpikesEffect } from './spikes-effect';
import { ToxicSpikesEffect } from './toxic-spikes-effect';
import { StealthRockEffect } from './stealth-rock-effect';
import { StickyWebEffect } from './sticky-web-effect';

describe('設置技（まきびし・どくびし・ステルスロック・ねばねばネット）', () => {
  describe('SpikesEffect（まきびし）', () => {
    it('相手の陣営にまきびしを 1 層置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();

      // Act
      const message = await new SpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).spikesLayers).toBe(1);
      expect(getSideConditions(battle.sideState, 1).spikesLayers).toBeUndefined();
      expect(message).toBe('Spikes were scattered on the ground all around the opposing team!');
    });

    it('2 層あれば 3 層に重ねる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { spikesLayers: 2 });

      // Act
      await new SpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).spikesLayers).toBe(3);
    });

    it('3 層あれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { spikesLayers: 3 });

      // Act
      const message = await new SpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).spikesLayers).toBe(3);
      expect(message).toBe('But it failed');
    });
  });

  describe('ToxicSpikesEffect（どくびし）', () => {
    it('相手の陣営にどくびしを 1 層置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();

      // Act
      const message = await new ToxicSpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).toxicSpikesLayers).toBe(1);
      expect(message).toBe(
        'Poison spikes were scattered on the ground all around the opposing team!',
      );
    });

    it('1 層あれば 2 層に重ねる', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { toxicSpikesLayers: 1 });

      // Act
      await new ToxicSpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).toxicSpikesLayers).toBe(2);
    });

    it('2 層あれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { toxicSpikesLayers: 2 });

      // Act
      const message = await new ToxicSpikesEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).toxicSpikesLayers).toBe(2);
      expect(message).toBe('But it failed');
    });
  });

  describe('StealthRockEffect（ステルスロック）', () => {
    it('相手の陣営にステルスロックを置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();

      // Act
      const message = await new StealthRockEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).stealthRock).toBe(true);
      expect(message).toBe('Pointed stones float in the air around the opposing team!');
    });

    it('すでに置いてあれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { stealthRock: true });

      // Act
      const message = await new StealthRockEffect().onUse(get(1), get(2), context());

      // Assert
      expect(message).toBe('But it failed');
    });
  });

  describe('StickyWebEffect（ねばねばネット）', () => {
    it('相手の陣営にねばねばネットを置く', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();

      // Act
      const message = await new StickyWebEffect().onUse(get(1), get(2), context());

      // Assert
      const battle = (await battleRepository.findById(1))!;
      expect(getSideConditions(battle.sideState, 2).stickyWeb).toBe(true);
      expect(message).toBe(
        'A sticky web has been laid out on the ground around the opposing team!',
      );
    });

    it('すでに置いてあれば失敗する', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle();
      await battleRepository.patchSideConditions(1, 2, { stickyWeb: true });

      // Act
      const message = await new StickyWebEffect().onUse(get(1), get(2), context());

      // Assert
      expect(message).toBe('But it failed');
    });
  });

  it('リポジトリがなければ失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new SpikesEffect().onUse(
      get(1),
      get(2),
      context({ battleRepository: undefined }),
    );

    // Assert
    expect(message).toBe('But it failed');
  });
});
