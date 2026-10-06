import { BaseContactRecoilDamageEffect } from './base-contact-recoil-damage-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { HitResult } from '../../../battle-events/hit-result';

/**
 * テスト用の具象クラス（最大HPの1/8）
 */
class TestRecoilEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
  protected readonly abilityName = 'テストさめはだ';
}

/**
 * テスト用の具象クラス（防御側がひんしのときだけ発動）
 */
class TestFaintOnlyRecoilEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 4;
  protected readonly abilityName = 'テストゆうばく';

  protected shouldActivate(holder: BattlePokemonStatus): boolean {
    return holder.currentHp === 0;
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
  });

  const createContext = (battleRepository: IBattleRepository | undefined): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository,
    moveCategory: 'Physical',
  });

  const createHit = (isContact: boolean): HitResult => ({
    damage: 10,
    hpBefore: 100,
    hitIndex: 0,
    hitCount: 1,
    isContact,
    moveTypeName: 'ノーマル',
    moveCategory: 'Physical',
    targetFainted: false,
  });

  describe('onDamagingHit', () => {
    it('battleContextがない場合、何もしない', async () => {
      // Arrange
      const effect = new TestRecoilEffect();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        createHit(true),
        undefined,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('battleRepositoryがない場合、何もしない', async () => {
      // Arrange
      const effect = new TestRecoilEffect();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        createHit(true),
        createContext(undefined),
      );

      // Assert
      expect(result).toBeNull();
    });

    it('接触しないヒットの場合、攻撃側にダメージを与えない', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 100, 100),
        createHit(false),
        createContext(battleRepository),
      );

      // Assert
      expect(result).toBeNull();
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('接触したヒットの場合、攻撃側の最大HPの1/damageDivisor（切り捨て）のダメージを与える', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 150, 150),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(result).toBe('テストさめはだ activated!');
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {
        currentHp: 150 - 18,
      });
    });

    it('最大HPが小さくても最低1ダメージを与える', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 5, 5),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 4 });
    });

    it('攻撃側の残りHPを超えるダメージの場合、HPは0になる', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 3, 100),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 0 });
    });

    it('攻撃側のHPが既に0の場合、何もしない', async () => {
      // Arrange
      const effect = new TestRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 100, 100),
        createStatus(2, 0, 100),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(result).toBeNull();
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('shouldActivateがfalseを返す場合、ダメージを与えない', async () => {
      // Arrange
      const effect = new TestFaintOnlyRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 10, 100),
        createStatus(2, 100, 100),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(result).toBeNull();
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('shouldActivateがtrueを返す場合、ダメージを与える', async () => {
      // Arrange
      const effect = new TestFaintOnlyRecoilEffect();
      const battleRepository = createMockBattleRepository();

      // Act
      const result = await effect.onDamagingHit(
        createStatus(1, 0, 100),
        createStatus(2, 100, 100),
        createHit(true),
        createContext(battleRepository),
      );

      // Assert
      expect(result).toBe('テストゆうばく activated!');
      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, { currentHp: 75 });
    });
  });

  it('技全体で1回だけのフック（applyContactStatusCondition）は持たない（ヒットごとと二重にダメージを与えないため）', () => {
    // Arrange
    const effect = new TestRecoilEffect();

    // Act
    const hasHook = 'applyContactStatusCondition' in effect;

    // Assert
    expect(hasHook).toBe(false);
  });
});
