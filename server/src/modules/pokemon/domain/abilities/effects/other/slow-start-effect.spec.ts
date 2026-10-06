import { SlowStartEffect } from './slow-start-effect';
import { AbilityRegistry } from '../../ability-registry';
import { BattleContext } from '../../battle-context.interface';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('SlowStartEffect（スロースタート）', () => {
  /** 今のターン数と、持ち主の volatileState を決めたバトルを作る */
  const setup = async (turn: number, volatileState: VolatileState) => {
    const battle = createInMemoryBattle({ ability: 'スロースタート', status: { volatileState } });
    await battle.battleRepository.update(1, { turn });
    return battle;
  };

  describe('modifySpeed', () => {
    it.each([1, 5])('先発なら %i ターン目は素早さが半分（切り捨て）になる', async turn => {
      // Arrange
      const { context, get } = await setup(turn, { switchedInTurn: 0 });

      // Act
      const speed = new SlowStartEffect().modifySpeed(get(1), 101, context());

      // Assert
      expect(speed).toBe(50);
    });

    it('先発なら 6 ターン目からは素早さを変えない', async () => {
      // Arrange
      const { context, get } = await setup(6, { switchedInTurn: 0 });

      // Act
      const speed = new SlowStartEffect().modifySpeed(get(1), 101, context());

      // Assert
      expect(speed).toBeUndefined();
    });

    it.each([
      [3, 50],
      [8, 50],
      [9, undefined],
    ])('3 ターン目に交代で出たら、%i ターン目の素早さ 101 は %s になる', async (turn, expected) => {
      // Arrange
      const { context, get } = await setup(turn, { switchedInTurn: 3 });

      // Act
      const speed = new SlowStartEffect().modifySpeed(get(1), 101, context());

      // Assert
      expect(speed).toBe(expected);
    });

    it('場に出たターンが分からなければ、素早さを変えない', async () => {
      // Arrange
      const { context, get } = await setup(1, {});

      // Act
      const speed = new SlowStartEffect().modifySpeed(get(1), 101, context());

      // Assert
      expect(speed).toBeUndefined();
    });
  });

  describe('modifyDamageDealt', () => {
    const physical: Partial<BattleContext> = { moveCategory: 'Physical', moveName: 'たいあたり' };

    it('出てから 5 ターンの間は、物理技のダメージが半分になる', async () => {
      // Arrange
      const { context, get } = await setup(5, { switchedInTurn: 0 });

      // Act
      const damage = new SlowStartEffect().modifyDamageDealt(get(1), 101, context(physical));

      // Assert
      expect(damage).toBe(50);
    });

    it('特殊技のダメージは変えない', async () => {
      // Arrange
      const { context, get } = await setup(1, { switchedInTurn: 0 });

      // Act
      const damage = new SlowStartEffect().modifyDamageDealt(
        get(1),
        101,
        context({ moveCategory: 'Special', moveName: '１０まんボルト' }),
      );

      // Assert
      expect(damage).toBeUndefined();
    });

    it('ボディプレスは攻撃ではなく防御で計算するので、ダメージを変えない', async () => {
      // Arrange
      const { context, get } = await setup(1, { switchedInTurn: 0 });

      // Act
      const damage = new SlowStartEffect().modifyDamageDealt(
        get(1),
        101,
        context({ moveCategory: 'Physical', moveName: 'ボディプレス' }),
      );

      // Assert
      expect(damage).toBeUndefined();
    });

    it('出てから 6 ターン目からは、物理技のダメージを変えない', async () => {
      // Arrange
      const { context, get } = await setup(6, { switchedInTurn: 0 });

      // Act
      const damage = new SlowStartEffect().modifyDamageDealt(get(1), 101, context(physical));

      // Assert
      expect(damage).toBeUndefined();
    });
  });

  it('AbilityRegistry に スロースタート として登録されている', () => {
    // Arrange
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('スロースタート');

    // Assert
    expect(effect).toBeInstanceOf(SlowStartEffect);
  });
});
