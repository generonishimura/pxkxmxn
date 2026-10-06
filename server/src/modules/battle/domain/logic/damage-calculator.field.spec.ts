import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Field } from '../entities/battle.entity';
import { SideState } from '../state/side-state';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * 場の状態（壁・ルーム・フィールド・じゅうりょく・どろあそび・らんきりゅう）のダメージ補正
 * 威力 100・能力 100 同士・タイプ一致なし・等倍なら、ダメージは 46
 */
describe('DamageCalculator - 場の状態の補正', () => {
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const FIRE = new Type(3, 'ほのお', 'Fire');
  const GROUND = new Type(4, 'じめん', 'Ground');
  const ELECTRIC = new Type(5, 'でんき', 'Electric');
  const FLYING = new Type(6, 'ひこう', 'Flying');
  const ROCK = new Type(9, 'いわ', 'Rock');

  const createStatus = (id: number, trainerId: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, trainerId, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const stats: BattleStatValues = {
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  };

  const createParams = (
    options: {
      sideState?: SideState;
      field?: Field | null;
      moveType?: Type;
      moveName?: string;
      power?: number;
      category?: 'Physical' | 'Special';
      attackerTypes?: { primary: Type; secondary: Type | null };
      defenderTypes?: { primary: Type; secondary: Type | null };
      attackerAbilityName?: string;
      defenderAbilityName?: string;
      defenderStats?: BattleStatValues;
      isCriticalHit?: boolean;
      sameTrainer?: boolean;
    } = {},
  ): DamageCalculationParams => {
    const battle = new Battle(
      1,
      1,
      2,
      1,
      2,
      1,
      null,
      options.field ?? null,
      BattleStatus.Active,
      null,
      options.sideState ?? {},
    );
    const moveType = options.moveType ?? FIRE;
    return {
      attacker: createStatus(1, 1),
      defender: createStatus(2, options.sameTrainer ? 1 : 2),
      move: {
        power: options.power ?? 100,
        typeId: moveType.id,
        category: options.category ?? 'Physical',
        accuracy: 100,
      },
      moveType,
      attackerTypes: options.attackerTypes ?? { primary: NORMAL, secondary: null },
      defenderTypes: options.defenderTypes ?? { primary: NORMAL, secondary: null },
      typeEffectiveness: new Map([
        ['4-6', 0], // じめん → ひこう
        ['9-6', 2], // いわ → ひこう
      ]),
      weather: null,
      field: options.field ?? null,
      attackerAbilityName: options.attackerAbilityName,
      defenderAbilityName: options.defenderAbilityName,
      attackerStats: stats,
      defenderStats: options.defenderStats ?? stats,
      battle,
      battleContext: {
        battle,
        moveName: options.moveName ?? 'テスト技',
        isCriticalHit: options.isCriticalHit,
      },
    };
  };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('壁', () => {
    it('相手の陣営にリフレクターがあると、物理技のダメージが半分になる', async () => {
      // Arrange
      const params = createParams({ sideState: { sides: { '2': { reflectTurns: 3 } } } });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(23);
    });

    it('相手の陣営にひかりのかべがあると、特殊技のダメージが半分になる', async () => {
      // Arrange
      const params = createParams({
        category: 'Special',
        sideState: { sides: { '2': { lightScreenTurns: 3 } } },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(23);
    });

    it('自分の陣営のリフレクターは、自分の技のダメージを減らさない', async () => {
      // Arrange
      const params = createParams({ sideState: { sides: { '1': { reflectTurns: 3 } } } });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('急所に当たったときは、壁でダメージが減らない', async () => {
      // Arrange
      const params = createParams({
        sideState: { sides: { '2': { auroraVeilTurns: 3 } } },
        isCriticalHit: true,
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('すりぬけの攻撃は、壁でダメージが減らない', async () => {
      // Arrange
      AbilityRegistry.register('すりぬけ', { infiltrates: true });
      const params = createParams({
        sideState: { sides: { '2': { reflectTurns: 3 } } },
        attackerAbilityName: 'すりぬけ',
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('自分を攻撃するとき（こんらんの自傷）は、壁でダメージが減らない', async () => {
      // Arrange
      const params = createParams({
        sideState: { sides: { '1': { reflectTurns: 3 } } },
        sameTrainer: true,
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });
  });

  describe('ワンダールーム', () => {
    it('ワンダールームの間は、物理技を相手の特防の実数値で受ける', async () => {
      // Arrange
      const params = createParams({
        sideState: { global: { wonderRoomTurns: 3 } },
        defenderStats: { ...stats, defense: 200 },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('ワンダールームがなければ、物理技は相手の防御で受ける', async () => {
      // Arrange
      const params = createParams({ defenderStats: { ...stats, defense: 200 } });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(24);
    });
  });

  describe('フィールド', () => {
    it('エレキフィールドで、地面にいるポケモンのでんき技は威力が 1.3 倍', async () => {
      // Arrange
      const params = createParams({ field: Field.ElectricTerrain, moveType: ELECTRIC });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(59);
    });

    it('ひこうタイプのでんき技は、エレキフィールドで強くならない', async () => {
      // Arrange
      const params = createParams({
        field: Field.ElectricTerrain,
        moveType: ELECTRIC,
        attackerTypes: { primary: FLYING, secondary: null },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('グラスフィールドで、地面にいる相手へのじしんは威力が半分', async () => {
      // Arrange
      const params = createParams({
        field: Field.GrassyTerrain,
        moveType: GROUND,
        moveName: 'じしん',
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(24);
    });
  });

  describe('どろあそび', () => {
    it('どろあそびの間は、でんき技の威力が 1352/4096 になる', async () => {
      // Arrange
      const params = createParams({
        sideState: { global: { mudSportTurns: 4 } },
        moveType: ELECTRIC,
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(16);
    });
  });

  describe('じゅうりょく', () => {
    it('じゅうりょくの間は、ひこうタイプにじめん技が当たる', async () => {
      // Arrange
      const params = createParams({
        sideState: { global: { gravityTurns: 3 } },
        moveType: GROUND,
        defenderTypes: { primary: FLYING, secondary: null },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('じゅうりょくの間は、ふゆうのポケモンにじめん技が当たる', async () => {
      // Arrange
      const params = createParams({
        sideState: { global: { gravityTurns: 3 } },
        moveType: GROUND,
        defenderAbilityName: 'ふゆう',
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('じゅうりょくがなければ、ふゆうのポケモンにじめん技は当たらない', async () => {
      // Arrange
      const params = createParams({ moveType: GROUND, defenderAbilityName: 'ふゆう' });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(0);
    });
  });

  describe('らんきりゅう', () => {
    it('らんきりゅうの間は、ひこうタイプへの弱点の技が等倍になる', async () => {
      // Arrange
      const params = createParams({
        sideState: { global: { primalWeather: 'strongWinds', weatherSourceStatusId: 9 } },
        moveType: ROCK,
        defenderTypes: { primary: FLYING, secondary: null },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(46);
    });

    it('らんきりゅうがなければ、ひこうタイプへのいわ技は 2 倍', async () => {
      // Arrange
      const params = createParams({
        moveType: ROCK,
        defenderTypes: { primary: FLYING, secondary: null },
      });

      // Act
      const damage = await DamageCalculator.calculate(params);

      // Assert
      expect(damage).toBe(92);
    });
  });
});
