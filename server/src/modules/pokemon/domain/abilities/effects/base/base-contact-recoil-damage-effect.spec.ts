import { BaseContactRecoilDamageEffect } from './base-contact-recoil-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

/**
 * テスト用の具象クラス（最大HPの1/8）
 */
class TestRecoilEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
}

/**
 * テスト用の具象クラス（防御側がひんしのときだけ発動）
 */
class TestFaintOnlyRecoilEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 4;

  protected shouldActivate(defender: BattlePokemonStatus): boolean {
    return defender.currentHp === 0;
  }
}

describe('BaseContactRecoilDamageEffect', () => {
  const createStatus = (id: number, currentHp: number, maxHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createMockBattleRepository = (): jest.Mocked<IBattleRepository> => ({
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findBattlePokemonStatusByBattleId: jest.fn(),
    createBattlePokemonStatus: jest.fn(),
    updateBattlePokemonStatus: jest.fn(),
    findActivePokemonByBattleIdAndTrainerId: jest.fn(),
    findBattlePokemonStatusById: jest.fn(),
    findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
    createBattlePokemonMove: jest.fn(),
    updateBattlePokemonMove: jest.fn(),
    findBattlePokemonMoveById: jest.fn(),
    patchVolatileState: jest.fn(),
    patchPersistentState: jest.fn(),
    patchSideConditions: jest.fn(),
    patchGlobalFieldState: jest.fn(),
  });

  const createContext = (
    battleRepository: IBattleRepository | undefined,
    moveCategory: BattleContext['moveCategory'],
  ): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    moveCategory,
  });

  describe('applyContactStatusCondition', () => {
    it('battleContextがない場合、falseを返す', async () => {
      // Arrange
      const effect = new TestRecoilEffect();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        undefined,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('battleRepositoryがない場合、falseを返す', async () => {
      // Arrange
      const effect = new TestRecoilEffect();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        createContext(undefined, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
    });

    it('特殊技の場合、攻撃側にダメージを与えない', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        createContext(battleRepository, 'Special'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('物理技の場合、攻撃側の最大HPの1/damageDivisor（切り捨て）のダメージを与える', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 150, 150),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        currentHp: 150 - 18,
      });
    });

    it('最大HPが小さくても最低1ダメージを与える', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 5, 5),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 4 });
    });

    it('攻撃側の残りHPを超えるダメージの場合、HPは0になる', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 3, 100),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 0 });
    });

    it('攻撃側のHPが既に0の場合、falseを返す', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 100, 100),
        createStatus(2, 0, 100),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('shouldActivateがfalseを返す場合、ダメージを与えない', async () => {
      // Arrange
      const effect = new TestFaintOnlyRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 10, 100),
        createStatus(2, 100, 100),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(false);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('shouldActivateがtrueを返す場合、ダメージを与える', async () => {
      // Arrange
      const effect = new TestFaintOnlyRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.applyContactStatusCondition(
        createStatus(1, 0, 100),
        createStatus(2, 100, 100),
        createContext(battleRepository, 'Physical'),
      );

      // Assert
      expect(result).toBe(true);
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 75 });
    });
  });

  it('modifyDamageはダメージを変更しない', () => {
    // Arrange
    const effect = new TestRecoilEffect();

    // Act
    const result = effect.modifyDamage(createStatus(1, 100, 100), 50);

    // Assert
    expect(result).toBe(50);
  });
});
