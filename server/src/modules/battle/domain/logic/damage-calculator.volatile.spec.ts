import { DamageCalculator, DamageCalculationParams } from './damage-calculator';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '../entities/battle.entity';
import { VolatileState } from '../state/volatile-state';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

describe('DamageCalculator - 一時的な状態（volatileState）の補正', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const GHOST = new Type(2, 'ゴースト', 'Ghost');
  const FIRE = new Type(3, 'ほのお', 'Fire');
  const GROUND = new Type(4, 'じめん', 'Ground');
  const ELECTRIC = new Type(5, 'でんき', 'Electric');
  const FLYING = new Type(6, 'ひこう', 'Flying');
  const PSYCHIC = new Type(7, 'エスパー', 'Psychic');
  const DARK = new Type(8, 'あく', 'Dark');

  const createStatus = (id: number, volatileState: VolatileState = {}): BattlePokemonStatus =>
    new BattlePokemonStatus(
      id,
      1,
      id,
      id,
      true,
      100,
      100,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      volatileState,
    );

  const stats = { attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 };

  const createParams = (
    moveType: Type,
    defenderType: Type,
    options: { attacker?: VolatileState; defender?: VolatileState; moveName?: string } = {},
  ): DamageCalculationParams => ({
    attacker: createStatus(1, options.attacker),
    defender: createStatus(2, options.defender),
    move: { power: 100, typeId: moveType.id, category: 'Physical', accuracy: 100 },
    moveType,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: defenderType, secondary: null },
    typeEffectiveness: new Map([
      ['1-2', 0], // ノーマル → ゴースト
      ['4-6', 0], // じめん → ひこう
      ['7-8', 0], // エスパー → あく
    ]),
    weather: null,
    field: null,
    attackerStats: stats,
    defenderStats: stats,
    battle,
    battleContext: { battle, moveName: options.moveName ?? 'テスト技' },
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('みやぶられたゴーストタイプには、ノーマル技が等倍で当たる', async () => {
    // Arrange
    const params = createParams(NORMAL, GHOST, { defender: { foresight: true } });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBeGreaterThan(0);
  });

  it('みやぶられていないゴーストタイプには、ノーマル技は当たらない', async () => {
    // Arrange
    const params = createParams(NORMAL, GHOST);

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(0);
  });

  it('ミラクルアイを受けたあくタイプには、エスパー技が当たる', async () => {
    // Arrange
    const params = createParams(PSYCHIC, DARK, { defender: { miracleEye: true } });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBeGreaterThan(0);
  });

  it('ねをはったひこうタイプには、じめん技が当たる', async () => {
    // Arrange
    const params = createParams(GROUND, FLYING, { defender: { ingrain: true } });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBeGreaterThan(0);
  });

  it('でんじふゆう中は、じめん技が当たらない', async () => {
    // Arrange
    const params = createParams(GROUND, NORMAL, { defender: { magnetRiseTurns: 3 } });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(0);
    expect(DamageCalculator.calculateMoveEffectiveness(params)).toBe(0);
  });

  it('テレキネシス中は、じめん技が当たらない', async () => {
    // Arrange
    const params = createParams(GROUND, NORMAL, { defender: { telekinesisTurns: 2 } });

    // Act
    const damage = await DamageCalculator.calculate(params);

    // Assert
    expect(damage).toBe(0);
  });

  it('タールショットを受けていると、ほのお技の相性が 2 倍になる', async () => {
    // Arrange
    const normal = await DamageCalculator.calculate(createParams(FIRE, NORMAL));

    // Act
    const tarred = await DamageCalculator.calculate(
      createParams(FIRE, NORMAL, { defender: { tarShot: true } }),
    );

    // Assert
    expect(tarred).toBe(normal * 2);
    expect(
      DamageCalculator.calculateMoveEffectiveness(
        createParams(FIRE, NORMAL, { defender: { tarShot: true } }),
      ),
    ).toBe(2);
  });

  it('じゅうでん中は、でんき技の威力が 2 倍になる', async () => {
    // Arrange
    const normal = await DamageCalculator.calculate(createParams(ELECTRIC, NORMAL));

    // Act
    const charged = await DamageCalculator.calculate(
      createParams(ELECTRIC, NORMAL, { attacker: { charged: true } }),
    );

    // Assert
    expect(charged).toBeGreaterThanOrEqual(normal * 2 - 2);
    expect(charged).toBeLessThanOrEqual(normal * 2);
  });

  it('じゅうでん中でも、でんき以外の技の威力は変わらない', async () => {
    // Arrange
    const normal = await DamageCalculator.calculate(createParams(FIRE, NORMAL));

    // Act
    const charged = await DamageCalculator.calculate(
      createParams(FIRE, NORMAL, { attacker: { charged: true } }),
    );

    // Assert
    expect(charged).toBe(normal);
  });

  it('あなをほるで隠れている相手に、じしんは 2 倍のダメージを与える', async () => {
    // Arrange
    const normal = await DamageCalculator.calculate(
      createParams(GROUND, NORMAL, { moveName: 'じしん' }),
    );

    // Act
    const doubled = await DamageCalculator.calculate(
      createParams(GROUND, NORMAL, {
        moveName: 'じしん',
        defender: { semiInvulnerable: 'underground' },
      }),
    );

    // Assert
    expect(doubled).toBe(normal * 2);
  });

  it('パワートリックなどの実数値の上書き（statOverrides）は、渡された実数値より優先する', async () => {
    // Arrange
    const normal = await DamageCalculator.calculate(createParams(NORMAL, NORMAL));

    // Act
    const boosted = await DamageCalculator.calculate(
      createParams(NORMAL, NORMAL, { attacker: { statOverrides: { attack: 200 } } }),
    );

    // Assert
    expect(boosted).toBeGreaterThan(normal);
  });
});
