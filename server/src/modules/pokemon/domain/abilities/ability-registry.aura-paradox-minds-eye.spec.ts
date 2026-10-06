import { AbilityRegistry } from './ability-registry';
import { FairyAuraEffect } from './effects/damage-modify/fairy-aura-effect';
import { AuraBreakEffect } from './effects/damage-modify/aura-break-effect';
import { ProtosynthesisEffect } from './effects/stat-change/protosynthesis-effect';
import { QuarkDriveEffect } from './effects/stat-change/quark-drive-effect';
import { MindsEyeEffect } from './effects/stat-change/minds-eye-effect';
import {
  DamageCalculator,
  DamageCalculationParams,
} from '@/modules/battle/domain/logic/damage-calculator';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';

describe('AbilityRegistry（オーラ・こだいかっせい・クォークチャージ・しんがん）', () => {
  const NORMAL = new Type(1, 'ノーマル', 'Normal');
  const GHOST = new Type(2, 'ゴースト', 'Ghost');
  const FAIRY = new Type(3, 'フェアリー', 'Fairy');
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const stats = (defense = 100) => ({
    attack: 100,
    defense,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
  });

  const createParams = (overrides?: Partial<DamageCalculationParams>): DamageCalculationParams => ({
    attacker: createStatus(1),
    defender: createStatus(2),
    move: { power: 100, typeId: FAIRY.id, category: 'Special', accuracy: 100 },
    moveType: FAIRY,
    attackerTypes: { primary: NORMAL, secondary: null },
    defenderTypes: { primary: NORMAL, secondary: null },
    typeEffectiveness: new Map([
      ['1-2', 0],
      ['3-1', 1],
    ]),
    weather: null,
    field: null,
    attackerStats: stats(),
    defenderStats: stats(),
    battle,
    ...overrides,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it.each([
    ['フェアリーオーラ', FairyAuraEffect],
    ['オーラブレイク', AuraBreakEffect],
    ['こだいかっせい', ProtosynthesisEffect],
    ['クォークチャージ', QuarkDriveEffect],
    ['しんがん', MindsEyeEffect],
  ])('%s が DB の特性名で登録されている', (name, effectClass) => {
    // Act
    const effect = AbilityRegistry.get(name);

    // Assert
    expect(effect).toBeInstanceOf(effectClass);
  });

  it('相手のフェアリーオーラでも、フェアリー技のダメージが上がる', async () => {
    // Arrange
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ defenderAbilityName: 'フェアリーオーラ' }),
    );

    // Assert
    expect(damage).toBeGreaterThan(base);
  });

  it('オーラブレイクがいると、フェアリーオーラでフェアリー技のダメージが下がる', async () => {
    // Arrange
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({
        attackerAbilityName: 'オーラブレイク',
        defenderAbilityName: 'フェアリーオーラ',
      }),
    );

    // Assert
    expect(damage).toBeLessThan(base);
  });

  it('オーラブレイクだけでは、フェアリー技のダメージは変わらない', async () => {
    // Arrange
    const base = await DamageCalculator.calculate(createParams());

    // Act
    const damage = await DamageCalculator.calculate(
      createParams({ attackerAbilityName: 'オーラブレイク' }),
    );

    // Assert
    expect(damage).toBe(base);
  });

  it('しんがんのノーマル技は、ゴーストタイプにダメージを与える', async () => {
    // Arrange
    const params = createParams({
      move: { power: 100, typeId: NORMAL.id, category: 'Physical', accuracy: 100 },
      moveType: NORMAL,
      defenderTypes: { primary: GHOST, secondary: null },
    });

    // Act
    const withoutAbility = await DamageCalculator.calculate(params);
    const damage = await DamageCalculator.calculate({ ...params, attackerAbilityName: 'しんがん' });

    // Assert
    expect(withoutAbility).toBe(0);
    expect(damage).toBeGreaterThan(0);
  });

  it('こだいかっせいの防御の上昇は、攻撃側のかたやぶりで無視されない', async () => {
    // Arrange
    const params = createParams({
      move: { power: 100, typeId: NORMAL.id, category: 'Physical', accuracy: 100 },
      moveType: NORMAL,
      weather: Weather.Sun,
      attackerAbilityName: 'かたやぶり',
      defenderStats: stats(150),
    });
    const base = await DamageCalculator.calculate(params);

    // Act
    const damage = await DamageCalculator.calculate({
      ...params,
      defenderAbilityName: 'こだいかっせい',
    });

    // Assert
    expect(damage).toBeLessThan(base);
  });
});
