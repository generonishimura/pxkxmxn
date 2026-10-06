import { DreamEaterEffect } from './dream-eater-effect';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('DreamEaterEffect', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストヘドロえき', { reversesDrainHeal: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('shouldFail', () => {
    it('相手がねむりなら失敗しない', () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle(
        {},
        { status: { statusCondition: StatusCondition.Sleep } },
      );

      // Act
      const failed = effect.shouldFail(get(1), get(2), context());

      // Assert
      expect(failed).toBe(false);
    });

    it.each([null, StatusCondition.None, StatusCondition.Paralysis, StatusCondition.Confusion])(
      '相手の状態が %s なら失敗する',
      statusCondition => {
        // Arrange
        const effect = new DreamEaterEffect();
        const { context, get } = createInMemoryBattle({}, { status: { statusCondition } });

        // Act
        const failed = effect.shouldFail(get(1), get(2), context());

        // Assert
        expect(failed).toBe(true);
      },
    );

    it('相手の特性が ぜったいねむり なら、ねむりでなくても失敗しない', () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle({}, {});

      // Act
      const failed = effect.shouldFail(
        get(1),
        get(2),
        context({ defenderAbilityName: 'ぜったいねむり' }),
      );

      // Assert
      expect(failed).toBe(false);
    });
  });

  describe('afterDamage', () => {
    it('与えたダメージの半分（四捨五入）だけ回復する', async () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle({ status: { currentHp: 40 } });

      // Act
      const message = await effect.afterDamage(get(1), get(2), 45, context());

      // Assert
      expect(get(1).currentHp).toBe(63);
      expect(message).toBe('HP was restored!');
    });

    it('最大HPを超えて回復しない', async () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle({ status: { currentHp: 90 } });

      // Act
      await effect.afterDamage(get(1), get(2), 60, context());

      // Assert
      expect(get(1).currentHp).toBe(100);
    });

    it('HPが満タンなら回復せず、メッセージも出さない', async () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle();

      // Act
      const message = await effect.afterDamage(get(1), get(2), 60, context());

      // Assert
      expect(get(1).currentHp).toBe(100);
      expect(message).toBeNull();
    });

    it('相手が reversesDrainHeal の特性（ヘドロえき）なら、回復せずに同じ量のダメージを受ける', async () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle(
        { status: { currentHp: 80 } },
        { ability: 'テストヘドロえき' },
      );

      // Act
      const message = await effect.afterDamage(get(1), get(2), 40, context());

      // Assert
      expect(get(1).currentHp).toBe(60);
      expect(message).toBe('sucked up the liquid ooze!');
    });

    it('ダメージが0なら回復しない', async () => {
      // Arrange
      const effect = new DreamEaterEffect();
      const { context, get } = createInMemoryBattle({ status: { currentHp: 40 } });

      // Act
      const message = await effect.afterDamage(get(1), get(2), 0, context());

      // Assert
      expect(get(1).currentHp).toBe(40);
      expect(message).toBeNull();
    });
  });

  it('MoveRegistry に ゆめくい として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('ゆめくい');

    // Assert
    expect(effect).toBeInstanceOf(DreamEaterEffect);
  });
});
