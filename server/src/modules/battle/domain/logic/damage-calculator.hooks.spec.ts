import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { StatusCondition } from '../entities/status-condition.enum';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveFlag } from '@/modules/pokemon/domain/moves/move-flags';

describe('DamageCalculator - ダメージ前フック', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const GHOST = new Type(2, 'ゴースト', 'Ghost');
  const FIGHTING = new Type(3, 'かくとう', 'Fighting');

  const createStatus = (overrides?: Partial<BattlePokemonStatus>): BattlePokemonStatus =>
    new BattlePokemonStatus(
      overrides?.id ?? 1,
      1,
      overrides?.id ?? 1,
      overrides?.id ?? 1,
      true,
      100,
      100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      0,
      0,
      0,
      0,
      0,
      overrides?.statusCondition ?? null,
    );

  const stats = (attack: number) => ({
    attack,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  });

  const createParams = (overrides?: Partial<DamageCalculationParams>): DamageCalculationParams => ({
    attacker: createStatus({ id: 1 }),
    defender: createStatus({ id: 2 }),
    move: { power: 100, typeId: FIGHTING.id, category: 'Physical', accuracy: 100 },
    moveType: FIGHTING,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map([['3-1', 2]]),
    weather: null,
    field: null,
    attackerStats: stats(100),
    defenderStats: stats(100),
    battle,
    ...overrides,
  });

  const flagsContext = (flags: MoveFlag[]): BattleContext => ({
    battle,
    moveName: 'テスト技',
    moveFlags: new Set(flags),
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('modifyBasePower（攻撃側の威力補正）', () => {
    it('攻撃側特性が威力を変えると、その威力でダメージを計算する', async () => {
      // Arrange
      const ironFistLike: IAbilityEffect = {
        modifyBasePower: (_p, power, ctx) =>
          ctx?.moveFlags?.has('punch') ? Math.floor(power * 1.2) : undefined,
      };
      AbilityRegistry.register('テストこぶし', ironFistLike);
      const expected = await DamageCalculator.calculate(
        createParams({ move: { power: 120, typeId: 3, category: 'Physical', accuracy: 100 } }),
      );

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          attackerAbilityName: 'テストこぶし',
          battleContext: flagsContext(['punch']),
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });

    it('フラグが合わない場合は威力を変えない', async () => {
      // Arrange
      AbilityRegistry.register('テストこぶし', {
        modifyBasePower: (_p, power, ctx) =>
          ctx?.moveFlags?.has('punch') ? Math.floor(power * 1.2) : undefined,
      });
      const expected = await DamageCalculator.calculate(createParams());

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({ attackerAbilityName: 'テストこぶし', battleContext: flagsContext([]) }),
      );

      // Assert
      expect(damage).toBe(expected);
    });

    it('コンテキストに補正前の威力・攻撃側・防御側が入っている', async () => {
      // Arrange
      const captured: BattleContext[] = [];
      AbilityRegistry.register('テスト記録', {
        modifyBasePower: (_p, _power, ctx) => {
          if (ctx) captured.push(ctx);
          return undefined;
        },
      });
      const params = createParams({ attackerAbilityName: 'テスト記録' });

      // Act
      await DamageCalculator.calculate(params);

      // Assert
      expect(captured[0].movePower).toBe(100);
      expect(captured[0].attacker).toBe(params.attacker);
      expect(captured[0].defender).toBe(params.defender);
      expect(captured[0].typeEffectiveness).toBe(2);
    });
  });

  describe('modifyAnyBasePower（場全体の威力補正）', () => {
    it('防御側の特性でも呼ばれる', async () => {
      // Arrange
      AbilityRegistry.register('テストオーラ', {
        modifyAnyBasePower: (_h, power) => power * 2,
      });
      const expected = await DamageCalculator.calculate(
        createParams({ move: { power: 200, typeId: 3, category: 'Physical', accuracy: 100 } }),
      );

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({ defenderAbilityName: 'テストオーラ' }),
      );

      // Assert
      expect(damage).toBe(expected);
    });

    it('両側が同じ特性の場合は1回だけ呼ばれる', async () => {
      // Arrange
      const hook = jest.fn((_h: BattlePokemonStatus, power: number) => power);
      AbilityRegistry.register('テストオーラ', { modifyAnyBasePower: hook });

      // Act
      await DamageCalculator.calculate(
        createParams({ attackerAbilityName: 'テストオーラ', defenderAbilityName: 'テストオーラ' }),
      );

      // Assert
      expect(hook).toHaveBeenCalledTimes(1);
    });
  });

  describe('タイプ相性のコンテキスト', () => {
    it('modifyDamageDealt と modifyDamage にタイプ相性が渡される', async () => {
      // Arrange
      const dealt: Array<number | undefined> = [];
      const taken: Array<number | undefined> = [];
      AbilityRegistry.register('テスト攻撃', {
        modifyDamageDealt: (_p, damage, ctx) => {
          dealt.push(ctx?.typeEffectiveness);
          return damage;
        },
      });
      AbilityRegistry.register('テスト防御', {
        modifyDamage: (_p, damage, ctx) => {
          taken.push(ctx?.typeEffectiveness);
          return damage;
        },
      });

      // Act
      await DamageCalculator.calculate(
        createParams({ attackerAbilityName: 'テスト攻撃', defenderAbilityName: 'テスト防御' }),
      );

      // Assert
      expect(dealt).toEqual([2]);
      expect(taken).toEqual([2]);
    });

    it('isImmuneToType にタイプ相性が渡され、効果抜群以外を無効にできる', async () => {
      // Arrange
      AbilityRegistry.register('テストまもり', {
        isImmuneToType: (_p, _t, ctx) => (ctx?.typeEffectiveness ?? 1) <= 1,
      });

      // Act
      const neutral = await DamageCalculator.calculate(
        createParams({
          defenderAbilityName: 'テストまもり',
          typeEffectiveness: new Map([['3-1', 1]]),
        }),
      );
      const superEffective = await DamageCalculator.calculate(
        createParams({ defenderAbilityName: 'テストまもり' }),
      );

      // Assert
      expect(neutral).toBe(0);
      expect(superEffective).toBeGreaterThan(0);
    });
  });

  describe('ignoresTypeImmunity（タイプ無効を等倍にする）', () => {
    it('攻撃側特性が許すと、相性0のタイプに等倍で当たる', async () => {
      // Arrange
      AbilityRegistry.register('テストしんがん', {
        ignoresTypeImmunity: (_p, moveType, defenderType) =>
          moveType === 'かくとう' && defenderType === 'ゴースト',
      });
      const neutral = await DamageCalculator.calculate(
        createParams({
          typeEffectiveness: new Map([['3-2', 1]]),
          defenderTypes: { primary: GHOST, secondary: null },
        }),
      );

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          attackerAbilityName: 'テストしんがん',
          typeEffectiveness: new Map([['3-2', 0]]),
          defenderTypes: { primary: GHOST, secondary: null },
        }),
      );

      // Assert
      expect(damage).toBe(neutral);
      expect(damage).toBeGreaterThan(0);
    });
  });

  describe('ランク無視', () => {
    it('ignoredDefenderRanks に defense があると防御ランクを無視する', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams());

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          defender: createStatus({ id: 2, defenseRank: 6 }),
          battleContext: { battle, ignoredDefenderRanks: new Set(['defense']) },
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });

    it('ignoredAttackerRanks に attack があると攻撃ランクを無視する', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams());

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          attacker: createStatus({ id: 1, attackRank: 6 }),
          battleContext: { battle, ignoredAttackerRanks: new Set(['attack']) },
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });

  describe('attackStatOverride（攻撃に使う能力の参照先）', () => {
    it('source が defender の場合、防御側の攻撃の実数値とランクで計算する', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(
        createParams({
          attacker: createStatus({ id: 1, attackRank: 1 }),
          attackerStats: stats(200),
        }),
      );

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          attacker: createStatus({ id: 1, attackRank: -6 }),
          defender: createStatus({ id: 2, attackRank: 1 }),
          attackerStats: stats(50),
          defenderStats: stats(200),
          attackStatOverride: { source: 'defender', stat: 'attack' },
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });

  describe('ignoresBurnPenalty（やけど半減を受けない）', () => {
    it('やけど状態でも物理技のダメージが半減しない', async () => {
      // Arrange
      const expected = await DamageCalculator.calculate(createParams());

      // Act
      const damage = await DamageCalculator.calculate(
        createParams({
          attacker: createStatus({ id: 1, statusCondition: StatusCondition.Burn }),
          ignoresBurnPenalty: true,
        }),
      );

      // Assert
      expect(damage).toBe(expected);
    });
  });
});
