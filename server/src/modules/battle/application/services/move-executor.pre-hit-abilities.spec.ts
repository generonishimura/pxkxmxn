import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { ThunderWaveEffect } from '@/modules/pokemon/domain/moves/effects/thunder-wave-effect';
import { DreamEaterEffect } from '@/modules/pokemon/domain/moves/effects/dream-eater-effect';
import { ATTACKER_ID, createMove, setupMoveExecutor } from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技を出す前に失敗・無効にする特性と ゆめくい', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('しめりけ', () => {
    it('相手が しめりけ なら だいばくはつ は失敗する', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('だいばくはつ', MoveCategory.Physical, 250),
        defenderAbility: 'しめりけ',
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe('Used だいばくはつ but it failed (しめりけ)');
    });

    it('相手が かたやぶり なら しめりけ を無視して だいばくはつ を使える', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('だいばくはつ', MoveCategory.Physical, 250),
        attackerAbility: 'かたやぶり',
        defenderAbility: 'しめりけ',
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });

    it('自分が しめりけ なら じばく は失敗する', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('じばく', MoveCategory.Physical, 200),
        attackerAbility: 'しめりけ',
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe('Used じばく but it failed (しめりけ)');
    });
  });

  describe.each(['じょおうのいげん', 'ビビッドボディ', 'テイルアーマー'])('%s', abilityName => {
    it('相手の優先度+1の技は失敗する', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('でんこうせっか', MoveCategory.Physical, 40, 1),
        defenderAbility: abilityName,
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe(`Used でんこうせっか but it failed (${abilityName})`);
    });

    it('相手が いたずらごころ の変化技も失敗する', async () => {
      // Arrange
      const { execute } = setupMoveExecutor({
        move: createMove('でんじは', MoveCategory.Status, null),
        attackerAbility: 'いたずらごころ',
        defenderAbility: abilityName,
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe(`Used でんじは but it failed (${abilityName})`);
    });

    it('優先度0の技は失敗しない', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('たいあたり', MoveCategory.Physical, 40, 0),
        defenderAbility: abilityName,
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });
  });

  describe('おうごんのからだ', () => {
    it('相手の変化技を無効にする', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('でんじは', MoveCategory.Status, null),
        moveEffect: new ThunderWaveEffect(),
        defenderAbility: 'おうごんのからだ',
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used でんじは but it had no effect');
      expect(statuses.get(2)?.statusCondition).toBeNull();
    });

    it('自分を対象にする変化技（つるぎのまい）は無効にしない', async () => {
      // Arrange
      const { execute } = setupMoveExecutor({
        move: createMove('つるぎのまい', MoveCategory.Status, null),
        defenderAbility: 'おうごんのからだ',
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used つるぎのまい');
    });

    it('攻撃技は無効にしない', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('たいあたり', MoveCategory.Physical, 40),
        defenderAbility: 'おうごんのからだ',
      });

      // Act
      await execute();

      // Assert
      expect(calculate).toHaveBeenCalled();
    });
  });

  describe('ゆめくい', () => {
    it('相手がねむりでなければ失敗する', async () => {
      // Arrange
      const { execute, calculate } = setupMoveExecutor({
        move: createMove('ゆめくい', MoveCategory.Special, 100),
        moveEffect: new DreamEaterEffect(),
      });

      // Act
      const message = await execute();

      // Assert
      expect(calculate).not.toHaveBeenCalled();
      expect(message).toBe('Used ゆめくい but it failed');
    });

    it('相手がねむりなら、与えたダメージの半分だけ回復する', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('ゆめくい', MoveCategory.Special, 100),
        moveEffect: new DreamEaterEffect(),
        attacker: { currentHp: 30 },
        defender: { statusCondition: StatusCondition.Sleep },
        damage: 41,
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID)?.currentHp).toBe(51);
      expect(message).toBe('Used ゆめくい and dealt 41 damage HP was restored!');
    });
  });
});
