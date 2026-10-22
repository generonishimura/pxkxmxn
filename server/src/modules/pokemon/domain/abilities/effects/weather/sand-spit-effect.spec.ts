import { SandSpitEffect } from './sand-spit-effect';
import { AbilityRegistry } from '../../ability-registry';
import { HitResult } from '../../../battle-events/hit-result';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('SandSpitEffect（すなはき）', () => {
  const hit = (targetFainted = false): HitResult => ({
    damage: 30,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted,
  });

  const battleWith = (weather: Weather | null): Battle =>
    new Battle(1, 1, 2, 1, 2, 1, weather, null, BattleStatus.Active, null);

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('すなはき として登録されている', () => {
    // Arrange & Act
    const effect = AbilityRegistry.get('すなはき');

    // Assert
    expect(effect).toBeInstanceOf(SandSpitEffect);
  });

  describe('onDamagingHit', () => {
    it('攻撃技を受けたら、天候をすなあらしにする', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { ability: 'すなはき' });

      // Act
      const message = await new SandSpitEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ battle: battleWith(Weather.Rain) }),
      );

      // Assert
      expect(battleRepository.update).toHaveBeenCalledWith(1, { weather: Weather.Sandstorm });
      expect(message).toBe('A sandstorm kicked up!');
    });

    it('自分がひんしになったヒットでも、天候をすなあらしにする', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle(
        {},
        { ability: 'すなはき', status: { currentHp: 0 } },
      );

      // Act
      await new SandSpitEffect().onDamagingHit(get(2), get(1), hit(true), context());

      // Assert
      expect(battleRepository.update).toHaveBeenCalledWith(1, { weather: Weather.Sandstorm });
    });

    it('すでにすなあらしなら、天候を書き込まない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { ability: 'すなはき' });

      // Act
      const message = await new SandSpitEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ battle: battleWith(Weather.Sandstorm) }),
      );

      // Assert
      expect(battleRepository.update).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });

    it('連続技の前のヒットですなあらしにしていたら、天候を書き込まない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({}, { ability: 'すなはき' });
      battleRepository.findById.mockResolvedValue(battleWith(Weather.Sandstorm));

      // Act
      const message = await new SandSpitEffect().onDamagingHit(
        get(2),
        get(1),
        hit(),
        context({ battle: battleWith(null) }),
      );

      // Assert
      expect(battleRepository.update).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });

    it('コンテキストがなければ何もしない', async () => {
      // Arrange
      const { get, battleRepository } = createInMemoryBattle({}, { ability: 'すなはき' });

      // Act
      const message = await new SandSpitEffect().onDamagingHit(get(2), get(1), hit());

      // Assert
      expect(battleRepository.update).not.toHaveBeenCalled();
      expect(message).toBeNull();
    });
  });
});
