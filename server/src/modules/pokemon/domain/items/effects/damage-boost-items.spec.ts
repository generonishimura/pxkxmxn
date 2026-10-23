import { LifeOrbEffect } from './life-orb-effect';
import { MetronomeItemEffect } from './metronome-item-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { HitResult } from '../../battle-events/hit-result';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';

describe('威力・ダメージを上げる持ち物（効果の単体）', () => {
  const createHolder = (volatileState: VolatileState = {}): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 160, 160, 0, 0, 0, 0, 0, 0, 0, null, volatileState);

  const createContext = (overrides: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
    ...overrides,
  });

  const hit: HitResult = {
    damage: 30,
    hpBefore: 160,
    hitIndex: 0,
    hitCount: 1,
    isContact: true,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  };

  describe('いのちのたま', () => {
    it('ちからずくの使い手が追加効果のある技を出したときは、HP を失わない', async () => {
      // Arrange
      const ctx = createContext({ attackerAbilityName: 'ちからずく', hasSecondaryEffect: true });

      // Act
      const message = await new LifeOrbEffect().onAfterMoveSecondarySelf(
        createHolder(),
        createHolder(),
        hit,
        ctx,
      );

      // Assert
      expect(message).toBeNull();
      expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });

  describe('メトロノーム', () => {
    it('別の技から呼ばれた技では、ダメージを上げない', () => {
      // Arrange
      const holder = createHolder({ lastMoveId: 5, consecutiveMoveCount: 2 });

      // Act
      const damage = new MetronomeItemEffect().modifyDamageDealt(
        holder,
        100,
        createContext({ moveId: 5, calledBy: 'ゆびをふる' }),
      );

      // Assert
      expect(damage).toBeUndefined();
    });

    it('2 回続けて成功させた技は、ダメージを 5734/4096 倍にする', () => {
      // Arrange
      const holder = createHolder({ lastMoveId: 5, consecutiveMoveCount: 2 });

      // Act
      const damage = new MetronomeItemEffect().modifyDamageDealt(
        holder,
        4096,
        createContext({ moveId: 5 }),
      );

      // Assert
      expect(damage).toBe(5734);
    });
  });
});
