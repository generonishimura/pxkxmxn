import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { BattleStatValues } from '../../abilities/battle-context.interface';
import { ShellSideArmEffect } from './shell-side-arm-effect';

describe('ShellSideArmEffect（シェルアームズ）', () => {
  const stats = (values: Partial<BattleStatValues>): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...values,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('modifyMoveCategory（物理と特殊のダメージが大きい方）', () => {
    const categoryOf = (params: {
      attackerStats: Partial<BattleStatValues>;
      defenderStats: Partial<BattleStatValues>;
      attacker?: Partial<BattlePokemonStatus>;
      defender?: Partial<BattlePokemonStatus>;
    }) => {
      const { context, get } = createInMemoryBattle(
        { status: params.attacker },
        { status: params.defender },
      );
      return new ShellSideArmEffect().modifyMoveCategory(
        get(1),
        get(2),
        context({
          attackerStats: stats(params.attackerStats),
          defenderStats: stats(params.defenderStats),
        }),
      );
    };

    it('攻撃 ÷ 相手の防御の方が大きければ、物理技になる', () => {
      // Act
      const category = categoryOf({ attackerStats: { attack: 150 }, defenderStats: {} });

      // Assert
      expect(category).toBe('Physical');
    });

    it('特攻 ÷ 相手の特防の方が大きければ、特殊技のまま', () => {
      // Act
      const category = categoryOf({ attackerStats: {}, defenderStats: { specialDefense: 50 } });

      // Assert
      expect(category).toBe('Special');
    });

    it('両者のランクを含めて比べる', () => {
      // Act
      const category = categoryOf({
        attackerStats: { specialAttack: 120 },
        defenderStats: {},
        attacker: { attackRank: 1 },
      });

      // Assert
      expect(category).toBe('Physical');
    });

    it('相手の防御ランクが上がっていれば、特殊技になる', () => {
      // Act
      const category = categoryOf({
        attackerStats: { attack: 120 },
        defenderStats: {},
        defender: { defenseRank: 2 },
      });

      // Assert
      expect(category).toBe('Special');
    });

    it('同じダメージなら、半々で物理技になる', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.49);

      // Act
      const category = categoryOf({ attackerStats: {}, defenderStats: {} });

      // Assert
      expect(category).toBe('Physical');
    });

    it('同じダメージで、乱数が半分以上なら特殊技のまま', () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      // Act
      const category = categoryOf({ attackerStats: {}, defenderStats: {} });

      // Assert
      expect(category).toBe('Special');
    });

    it('実数値が分からなければ、変えない', () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const category = new ShellSideArmEffect().modifyMoveCategory(get(1), get(2), context());

      // Assert
      expect(category).toBeUndefined();
    });
  });

  it('物理技になったときは接触技になる', () => {
    // Act
    const contact = new ShellSideArmEffect().contactWhenPhysical;

    // Assert
    expect(contact).toBe(true);
  });

  describe('onHit（20% でどく）', () => {
    it('20% に当たれば、相手をどくにする', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      jest.spyOn(Math, 'random').mockReturnValue(0.19);

      // Act
      const message = await new ShellSideArmEffect().onHit(get(1), get(2), context());

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.Poison);
      expect(message).toBe('was poisoned!');
    });

    it('20% に外れれば、どくにしない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();
      jest.spyOn(Math, 'random').mockReturnValue(0.2);

      // Act
      await new ShellSideArmEffect().onHit(get(1), get(2), context());

      // Assert
      expect(get(2).statusCondition).toBeNull();
    });
  });
});
