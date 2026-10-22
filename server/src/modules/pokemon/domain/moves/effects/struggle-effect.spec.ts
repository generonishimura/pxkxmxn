import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveRegistry } from '../move-registry';
import { StruggleEffect } from './struggle-effect';

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

describe('StruggleEffect', () => {
  it('命中後に最大HPの1/4（四捨五入）の反動ダメージを受ける', async () => {
    // Arrange
    const effect = new StruggleEffect();
    const attacker = createStatus(200, 203);
    const defender = createStatus(100, 100);
    const { battleContext, updateMock } = createContext(attacker);

    // Act
    const result = await effect.onHit(attacker, defender, battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 149 });
    expect(result).toBe('is damaged by recoil! (51 damage)');
  });

  it('最新のHPを基準にダメージを適用し、HPは0未満にならない', async () => {
    // Arrange
    const effect = new StruggleEffect();
    const attacker = createStatus(100, 100);
    const latest = createStatus(10, 100);
    const defender = createStatus(100, 100);
    const { battleContext, updateMock } = createContext(latest);

    // Act
    await effect.onHit(attacker, defender, battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 0 });
  });

  it('最大HPが4未満でも1ダメージを受ける', async () => {
    // Arrange
    const effect = new StruggleEffect();
    const attacker = createStatus(3, 3);
    const defender = createStatus(100, 100);
    const { battleContext, updateMock } = createContext(attacker);

    // Act
    await effect.onHit(attacker, defender, battleContext);

    // Assert
    expect(updateMock).toHaveBeenCalledWith(1, { currentHp: 2 });
  });

  it('バトルリポジトリがない場合は何もしない', async () => {
    // Arrange
    const effect = new StruggleEffect();
    const attacker = createStatus(100, 100);
    const defender = createStatus(100, 100);
    const battleContext: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act
    const result = await effect.onHit(attacker, defender, battleContext);

    // Assert
    expect(result).toBeNull();
  });

  it('タイプなしの技である（本家と同じ）', () => {
    // Arrange
    const effect = new StruggleEffect();

    // Act
    const typeless = effect.typeless;

    // Assert
    expect(typeless).toBe(true);
  });

  it('わるあがきとして登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const registered = MoveRegistry.get('わるあがき');

    // Assert
    expect(registered).toBeInstanceOf(StruggleEffect);
  });
});
