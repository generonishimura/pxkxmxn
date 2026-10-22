import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { MoveRegistry } from '../../move-registry';
import { JumpKickEffect } from '../jump-kick-effect';
import { HighJumpKickEffect } from '../high-jump-kick-effect';
import { BaseCrashDamageEffect } from './base-crash-damage-effect';

const createStatus = (currentHp: number, maxHp: number): BattlePokemonStatus =>
  new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

const createContext = (
  latestAttacker: BattlePokemonStatus | null,
): { battleContext: BattleContext; updateMock: jest.Mock } => {
  const updateMock = jest.fn().mockResolvedValue(undefined);
  const battleRepository = {
    findBattlePokemonStatusById: jest.fn().mockResolvedValue(latestAttacker),
    updateBattlePokemonStatus: updateMock,
  } as unknown as IBattleRepository;
  return {
    battleContext: {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository,
    },
    updateMock,
  };
};

describe('BaseCrashDamageEffect', () => {
  const effects: Array<[string, BaseCrashDamageEffect]> = [
    ['とびげり', new JumpKickEffect()],
    ['とびひざげり', new HighJumpKickEffect()],
  ];

  describe.each(effects)('%s', (_name, effect) => {
    it('外れたとき最大HPの半分（切り捨て）のダメージを自分が受ける', async () => {
      // Arrange
      const attacker = createStatus(150, 151);
      const defender = createStatus(100, 100);
      const { battleContext, updateMock } = createContext(attacker);

      // Act
      const result = await effect.onMiss(attacker, defender, battleContext);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 75 });
      expect(result).toBe('kept going and crashed! (75 damage)');
    });

    it('最新のHPを基準にダメージを適用し、HPは0未満にならない', async () => {
      // Arrange
      const attacker = createStatus(100, 100);
      const latest = createStatus(30, 100);
      const defender = createStatus(100, 100);
      const { battleContext, updateMock } = createContext(latest);

      // Act
      await effect.onMiss(attacker, defender, battleContext);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 0 });
    });

    it('最大HPが1のときも1ダメージを受ける', async () => {
      // Arrange
      const attacker = createStatus(1, 1);
      const defender = createStatus(100, 100);
      const { battleContext, updateMock } = createContext(attacker);

      // Act
      await effect.onMiss(attacker, defender, battleContext);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 0 });
    });

    it('バトルリポジトリがない場合は何もしない', async () => {
      // Arrange
      const attacker = createStatus(100, 100);
      const defender = createStatus(100, 100);
      const battleContext: BattleContext = {
        battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      };

      // Act
      const result = await effect.onMiss(attacker, defender, battleContext);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('MoveRegistry', () => {
    it.each(effects)('%s が登録されている', (name, effect) => {
      // Arrange
      MoveRegistry.initialize();

      // Act
      const registered = MoveRegistry.get(name);

      // Assert
      expect(registered).toBeInstanceOf(effect.constructor);
    });
  });
});
