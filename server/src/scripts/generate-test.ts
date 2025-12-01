#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * テストテンプレート生成スクリプト
 * config/abilities.jsonから特性効果クラスのテストファイルを自動生成
 */

interface AbilityConfig {
  baseClass: string;
  category: 'immunity' | 'stat-change' | 'damage-modify' | 'weather' | 'other';
  params: Record<string, any>;
  description: string;
  descriptionEn?: string;
  className?: string;
}

interface AbilitiesConfig {
  [abilityName: string]: AbilityConfig;
}

/**
 * クラス名を生成（特性名から）
 * 将来的に使用される可能性があるため、プレフィックスを付けて保持
 */
function _generateClassName(abilityName: string, config?: AbilityConfig): string {
  if (config?.className) {
    return config.className;
  }

  const nameMap: Record<string, string> = {
    ちくでん: 'VoltAbsorb',
    すいすい: 'SwiftSwim',
    ようりょくそ: 'Chlorophyll',
    すなかき: 'SandRush',
    いかく: 'Intimidate',
    ふゆう: 'Levitate',
    ちょすい: 'WaterAbsorb',
    もらいび: 'FlashFire',
    あついしぼう: 'ThickFat',
    はがねつかい: 'Steelworker',
    マルチスケイル: 'Multiscale',
    ふみん: 'Insomnia',
    あめふらし: 'Drizzle',
    ひでり: 'Drought',
    すなあらし: 'SandStream',
    ゆきふらし: 'SnowWarning',
  };

  if (nameMap[abilityName]) {
    return `${nameMap[abilityName]}Effect`;
  }

  return `${abilityName}Effect`;
}

/**
 * テスト用の具象クラスを生成
 */
function generateTestClass(className: string, baseClass: string, params: Record<string, any>): string {
  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * テスト用の具象クラス`);
  lines.push(` */`);
  lines.push(`class Test${className} extends ${baseClass} {`);

  // 基底クラスに応じたパラメータの生成
  switch (baseClass) {
    case 'BaseTypeAbsorbEffect':
      if (params.immuneTypes) {
        lines.push(
          `  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`,
        );
      }
      if (params.healRatio !== undefined) {
        lines.push(`  protected readonly healRatio = ${params.healRatio};`);
      }
      break;

    case 'BaseWeatherDependentSpeedEffect':
      if (params.requiredWeathers) {
        const weathers = params.requiredWeathers.map((w: string) => `Weather.${w}`).join(', ');
        lines.push(`  protected readonly requiredWeathers = [${weathers}] as const;`);
      }
      if (params.speedMultiplier !== undefined) {
        const multiplier = Number.isInteger(params.speedMultiplier)
          ? `${params.speedMultiplier}.0`
          : params.speedMultiplier;
        lines.push(`  protected readonly speedMultiplier = ${multiplier};`);
      }
      break;

    case 'BaseTypeImmunityEffect':
      if (params.immuneTypes) {
        lines.push(
          `  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`,
        );
      }
      break;

    case 'BaseOpponentStatChangeEffect':
      if (params.statType) {
        lines.push(`  protected readonly statType = '${params.statType}' as const;`);
      }
      if (params.rankChange !== undefined) {
        lines.push(`  protected readonly rankChange = ${params.rankChange};`);
      }
      break;

    case 'BaseConditionalDamageEffect':
      if (params.conditionType) {
        lines.push(`  protected readonly conditionType = '${params.conditionType}' as const;`);
      }
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      break;

    case 'BaseWeatherDependentDamageEffect':
      if (params.requiredWeathers) {
        const weathers = params.requiredWeathers.map((w: string) => `Weather.${w}`).join(', ');
        lines.push(`  protected readonly requiredWeathers = [${weathers}] as const;`);
      }
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      break;

    case 'BaseTypeAbsorbAndBoostEffect':
      if (params.immuneTypes) {
        lines.push(
          `  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`,
        );
      }
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      break;

    case 'BaseStatusConditionImmunityEffect':
      if (params.immuneStatusConditions) {
        const conditions = params.immuneStatusConditions
          .map((c: string) => `StatusCondition.${c}`)
          .join(', ');
        lines.push(`  protected readonly immuneStatusConditions = [${conditions}] as const;`);
      }
      break;

    default:
      // その他の基底クラスの場合は、paramsをそのまま出力
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          lines.push(`  protected readonly ${key} = '${escaped}';`);
        } else if (typeof value === 'number') {
          lines.push(`  protected readonly ${key} = ${value};`);
        } else if (Array.isArray(value)) {
          if (value.length > 0 && value.every(v => typeof v === 'string')) {
            const escaped = value
              .map(v => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
              .join(', ');
            lines.push(`  protected readonly ${key} = [${escaped}] as const;`);
          } else {
            lines.push(`  protected readonly ${key} = ${JSON.stringify(value)} as const;`);
          }
        } else {
          lines.push(`  protected readonly ${key} = ${JSON.stringify(value)};`);
        }
      }
      break;
  }

  lines.push(`}`);
  return lines.join('\n');
}

/**
 * テストケースを生成
 */
function generateTestCases(baseClass: string, params: Record<string, any>): string {
  const lines: string[] = [];

  switch (baseClass) {
    case 'BaseTypeAbsorbEffect':
      lines.push(`  describe('isImmuneToType', () => {`);
      if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
        const immuneType = params.immuneTypes[0];
        lines.push(`    it('should return true for immune type', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, '${immuneType}', battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return false for non-immune type', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);`);
        lines.push(`      expect(result).toBe(false);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      lines.push(``);
      lines.push(`  describe('onAfterTakingDamage', () => {`);
      lines.push(`    it('should heal HP when immune type attack is absorbed', async () => {`);
      lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
      lines.push(`      await effect.onAfterTakingDamage(pokemon, 0, battleContext);`);
      lines.push(``);
      lines.push(`      expect(mockBattleRepository.findBattlePokemonStatusById).toHaveBeenCalledWith(1);`);
      if (params.healRatio !== undefined) {
        const healAmount = Math.floor(100 * params.healRatio);
        lines.push(`      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {`);
        lines.push(`        currentHp: ${50 + healAmount}, // 50 + (100 * ${params.healRatio}) = ${50 + healAmount}`);
        lines.push(`      });`);
      }
      lines.push(`    });`);
      lines.push(``);
      lines.push(`    it('should not heal HP when non-immune type attack', async () => {`);
      lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
      lines.push(`      const contextWithFire: BattleContext = {`);
      lines.push(`        ...battleContext,`);
      lines.push(`        moveTypeName: 'ほのお',`);
      lines.push(`      };`);
      lines.push(`      await effect.onAfterTakingDamage(pokemon, 0, contextWithFire);`);
      lines.push(``);
      lines.push(`      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();`);
      lines.push(`    });`);
      lines.push(``);
      lines.push(`    it('should cap HP at maxHp', async () => {`);
      lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
      lines.push(`      const pokemonNearMaxHp = {`);
      lines.push(`        ...pokemon,`);
      lines.push(`        currentHp: 90,`);
      lines.push(`        maxHp: 100,`);
      lines.push(`      } as BattlePokemonStatus;`);
      lines.push(`      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonNearMaxHp);`);
      lines.push(``);
      lines.push(`      await effect.onAfterTakingDamage(pokemonNearMaxHp, 0, battleContext);`);
      lines.push(``);
      lines.push(`      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {`);
      lines.push(`        currentHp: 100, // capped at maxHp`);
      lines.push(`      });`);
      lines.push(`    });`);
      break;

    case 'BaseWeatherDependentSpeedEffect':
      lines.push(`  describe('modifySpeed', () => {`);
      if (params.requiredWeathers && Array.isArray(params.requiredWeathers) && params.requiredWeathers.length > 0) {
        lines.push(`    it('should return modified speed for required weather', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        if (params.speedMultiplier !== undefined) {
          const expectedSpeed = Math.floor(100 * params.speedMultiplier);
          lines.push(`      const result = effect.modifySpeed(pokemon, 100, battleContext);`);
          lines.push(`      expect(result).toBe(${expectedSpeed}); // 100 * ${params.speedMultiplier} = ${expectedSpeed}`);
        }
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return undefined for non-required weather', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const contextWithoutWeather: BattleContext = {`);
        lines.push(`        ...battleContext,`);
        lines.push(`        battle: {`);
        lines.push(`          ...battleContext.battle,`);
        lines.push(`          weather: Weather.Sun,`);
        lines.push(`        },`);
        lines.push(`      };`);
        lines.push(`      const result = effect.modifySpeed(pokemon, 100, contextWithoutWeather);`);
        lines.push(`      expect(result).toBeUndefined();`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseTypeImmunityEffect':
      lines.push(`  describe('isImmuneToType', () => {`);
      if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
        const immuneType = params.immuneTypes[0];
        lines.push(`    it('should return true for immune type', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, '${immuneType}', battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return false for non-immune type', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);`);
        lines.push(`      expect(result).toBe(false);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseConditionalDamageEffect':
      lines.push(`  describe('modifyDamage', () => {`);
      if (params.conditionType) {
        lines.push(`    it('should modify damage when condition is met', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const pokemonWithCondition = createBattlePokemonStatus({`);
        if (params.conditionType === 'hpFull') {
          lines.push(`        currentHp: 100,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'hpHalf') {
          lines.push(`        currentHp: 50,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'hpQuarter') {
          lines.push(`        currentHp: 25,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'statusCondition') {
          lines.push(`        statusCondition: StatusCondition.Burn,`);
        }
        lines.push(`      });`);
        lines.push(`      const damage = 100;`);
        lines.push(``);
        lines.push(`      const result = effect.modifyDamage(pokemonWithCondition, damage);`);
        if (params.damageMultiplier !== undefined) {
          const expectedDamage = Math.floor(100 * params.damageMultiplier);
          lines.push(`      expect(result).toBe(${expectedDamage});`);
        }
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should not modify damage when condition is not met', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const pokemonWithoutCondition = createBattlePokemonStatus({`);
        if (params.conditionType === 'hpFull') {
          lines.push(`        currentHp: 99,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'hpHalf') {
          lines.push(`        currentHp: 51,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'hpQuarter') {
          lines.push(`        currentHp: 26,`);
          lines.push(`        maxHp: 100,`);
        } else if (params.conditionType === 'statusCondition') {
          lines.push(`        statusCondition: StatusCondition.None,`);
        }
        lines.push(`      });`);
        lines.push(`      const damage = 100;`);
        lines.push(``);
        lines.push(`      const result = effect.modifyDamage(pokemonWithoutCondition, damage);`);
        lines.push(`      expect(result).toBe(100);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseWeatherDependentDamageEffect':
      lines.push(`  describe('modifyDamageDealt', () => {`);
      if (params.requiredWeathers && Array.isArray(params.requiredWeathers) && params.requiredWeathers.length > 0) {
        lines.push(`    it('should return modified damage for required weather', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        if (params.damageMultiplier !== undefined) {
          const expectedDamage = Math.floor(100 * params.damageMultiplier);
          lines.push(`      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);`);
          lines.push(`      expect(result).toBe(${expectedDamage}); // 100 * ${params.damageMultiplier} = ${expectedDamage}`);
        }
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return undefined for non-required weather', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const contextWithoutWeather: BattleContext = {`);
        lines.push(`        ...battleContext,`);
        lines.push(`        battle: {`);
        lines.push(`          ...battleContext.battle,`);
        lines.push(`          weather: Weather.Sun,`);
        lines.push(`        },`);
        lines.push(`      };`);
        lines.push(`      const result = effect.modifyDamageDealt(pokemon, 100, contextWithoutWeather);`);
        lines.push(`      expect(result).toBeUndefined();`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseTypeAbsorbAndBoostEffect':
      lines.push(`  describe('isImmuneToType', () => {`);
      if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
        const immuneType = params.immuneTypes[0];
        lines.push(`    it('should return true for immune type', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, '${immuneType}', battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      lines.push(``);
      lines.push(`  describe('modifyDamageDealt', () => {`);
      lines.push(`    it('should return boosted damage for immune type', () => {`);
      lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
      if (params.damageMultiplier !== undefined) {
        const expectedDamage = Math.floor(100 * params.damageMultiplier);
        lines.push(`      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);`);
        lines.push(`      expect(result).toBe(${expectedDamage}); // 100 * ${params.damageMultiplier} = ${expectedDamage}`);
      }
      lines.push(`    });`);
      lines.push(`  });`);
      break;

    case 'BaseStatusConditionImmunityEffect':
      lines.push(`  describe('canReceiveStatusCondition', () => {`);
      if (params.immuneStatusConditions && Array.isArray(params.immuneStatusConditions) && params.immuneStatusConditions.length > 0) {
        const immuneCondition = params.immuneStatusConditions[0];
        lines.push(`    it('should return false for immune status condition', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.${immuneCondition}, battleContext);`);
        lines.push(`      expect(result).toBe(false);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return true for non-immune status condition', () => {`);
        lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
        lines.push(`      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    default:
      // その他の基底クラスの場合は、基本的なテストケースを生成
      lines.push(`  describe('basic functionality', () => {`);
      lines.push(`    it('should be instantiable', () => {`);
      lines.push(`      const effect = new Test${baseClass.replace('Base', '')}();`);
      lines.push(`      expect(effect).toBeDefined();`);
      lines.push(`    });`);
      lines.push(`  });`);
      break;
  }

  return lines.join('\n');
}

/**
 * 必要なインポートを生成
 */
function generateImports(baseClass: string, _category: string): string {
  const imports: string[] = [];
  const baseClassPath = baseClass.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  imports.push(`import { ${baseClass} } from './${baseClassPath}';`);
  imports.push(`import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';`);
  imports.push(`import { BattleContext } from '../../battle-context.interface';`);

  // 基底クラスに応じた追加のインポート
  if (
    baseClass === 'BaseWeatherDependentSpeedEffect' ||
    baseClass === 'BaseWeatherDependentDamageEffect' ||
    baseClass === 'BaseWeatherEffect'
  ) {
    imports.push(`import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
  } else if (baseClass === 'BaseConditionalDamageEffect') {
    imports.push(`import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';`);
  } else if (baseClass === 'BaseStatusConditionImmunityEffect') {
    imports.push(`import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';`);
    imports.push(`import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
  } else if (baseClass === 'BaseTypeAbsorbEffect' || baseClass === 'BaseOpponentStatChangeEffect') {
    imports.push(`import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';`);
    imports.push(`import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';`);
  } else if (baseClass === 'BaseTypeAbsorbAndBoostEffect') {
    imports.push(`import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
  } else {
    imports.push(`import { BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
  }

  return imports.join('\n');
}

/**
 * beforeEachセットアップを生成
 */
function generateBeforeEach(baseClass: string, params: Record<string, any>): string {
  const lines: string[] = [];
  lines.push(`  beforeEach(() => {`);
  lines.push(`    pokemon = {`);
  lines.push(`      id: 1,`);
  lines.push(`      battleId: 1,`);
  lines.push(`      trainedPokemonId: 1,`);
  lines.push(`      trainerId: 1,`);
  lines.push(`      isActive: true,`);
  lines.push(`      currentHp: 100,`);
  lines.push(`      maxHp: 100,`);
  lines.push(`      attackRank: 0,`);
  lines.push(`      defenseRank: 0,`);
  lines.push(`      specialAttackRank: 0,`);
  lines.push(`      specialDefenseRank: 0,`);
  lines.push(`      speedRank: 0,`);
  lines.push(`      accuracyRank: 0,`);
  lines.push(`      evasionRank: 0,`);
  if (baseClass === 'BaseStatusConditionImmunityEffect') {
    lines.push(`      statusCondition: StatusCondition.None,`);
  } else {
    lines.push(`      statusCondition: null,`);
  }
  lines.push(`    } as BattlePokemonStatus;`);
  lines.push(``);

  // 基底クラスに応じたbattleContextの生成
  if (baseClass === 'BaseTypeAbsorbEffect') {
    lines.push(`    mockBattleRepository = {`);
    lines.push(`      findBattlePokemonStatusById: jest.fn().mockResolvedValue({`);
    lines.push(`        ...pokemon,`);
    lines.push(`        currentHp: 50,`);
    lines.push(`      }),`);
    lines.push(`      updateBattlePokemonStatus: jest.fn().mockResolvedValue(pokemon),`);
    lines.push(`      findById: jest.fn(),`);
    lines.push(`      create: jest.fn(),`);
    lines.push(`      update: jest.fn(),`);
    lines.push(`      findBattlePokemonStatusByBattleId: jest.fn(),`);
    lines.push(`      createBattlePokemonStatus: jest.fn(),`);
    lines.push(`      findActivePokemonByBattleIdAndTrainerId: jest.fn(),`);
    lines.push(`      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),`);
    lines.push(`      createBattlePokemonMove: jest.fn(),`);
    lines.push(`      updateBattlePokemonMove: jest.fn(),`);
    lines.push(`      findBattlePokemonMoveById: jest.fn(),`);
    lines.push(`    } as jest.Mocked<IBattleRepository>;`);
    lines.push(``);
    if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
      lines.push(`    battleContext = {`);
      lines.push(`      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null),`);
      lines.push(`      battleRepository: mockBattleRepository,`);
      lines.push(`      moveTypeName: '${params.immuneTypes[0]}',`);
      lines.push(`    };`);
    }
  } else if (baseClass === 'BaseWeatherDependentSpeedEffect' || baseClass === 'BaseWeatherDependentDamageEffect') {
    if (params.requiredWeathers && Array.isArray(params.requiredWeathers) && params.requiredWeathers.length > 0) {
      const weather = params.requiredWeathers[0];
      lines.push(`    battleContext = {`);
      lines.push(`      battle: {`);
      lines.push(`        id: 1,`);
      lines.push(`        trainer1Id: 1,`);
      lines.push(`        trainer2Id: 2,`);
      lines.push(`        team1Id: 1,`);
      lines.push(`        team2Id: 2,`);
      lines.push(`        turn: 1,`);
      lines.push(`        weather: Weather.${weather},`);
      lines.push(`        field: null,`);
      lines.push(`        status: BattleStatus.Active,`);
      lines.push(`        winnerTrainerId: null,`);
      lines.push(`      },`);
      lines.push(`    };`);
    }
  } else if (baseClass === 'BaseTypeAbsorbAndBoostEffect') {
    lines.push(`    battleContext = {`);
    lines.push(`      battle: {`);
    lines.push(`        id: 1,`);
    lines.push(`        trainer1Id: 1,`);
    lines.push(`        trainer2Id: 2,`);
    lines.push(`        team1Id: 1,`);
    lines.push(`        team2Id: 2,`);
    lines.push(`        turn: 1,`);
    lines.push(`        weather: Weather.None,`);
    lines.push(`        field: null,`);
    lines.push(`        status: BattleStatus.Active,`);
    lines.push(`        winnerTrainerId: null,`);
    lines.push(`      },`);
    if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
      lines.push(`      moveTypeName: '${params.immuneTypes[0]}',`);
    }
    lines.push(`    };`);
  } else {
    lines.push(`    battleContext = {`);
    lines.push(`      battle: {`);
    lines.push(`        id: 1,`);
    lines.push(`        trainer1Id: 1,`);
    lines.push(`        trainer2Id: 2,`);
    lines.push(`        team1Id: 1,`);
    lines.push(`        team2Id: 2,`);
    lines.push(`        turn: 1,`);
    lines.push(`        weather: null,`);
    lines.push(`        field: null,`);
    lines.push(`        status: BattleStatus.Active,`);
    lines.push(`        winnerTrainerId: null,`);
    lines.push(`      },`);
    lines.push(`    };`);
  }
  lines.push(`  });`);

  return lines.join('\n');
}

/**
 * ヘルパー関数を生成
 */
function generateHelpers(baseClass: string): string {
  if (baseClass === 'BaseConditionalDamageEffect' || baseClass === 'BaseOpponentStatChangeEffect') {
    return `  // テスト用のヘルパー関数
  const createBattlePokemonStatus = (
    overrides?: Partial<BattlePokemonStatus>,
  ): BattlePokemonStatus => {
    return new BattlePokemonStatus(
      overrides?.id ?? 1,
      overrides?.battleId ?? 1,
      overrides?.trainedPokemonId ?? 1,
      overrides?.trainerId ?? 1,
      overrides?.isActive ?? true,
      overrides?.currentHp ?? 100,
      overrides?.maxHp ?? 100,
      overrides?.attackRank ?? 0,
      overrides?.defenseRank ?? 0,
      overrides?.specialAttackRank ?? 0,
      overrides?.specialDefenseRank ?? 0,
      overrides?.speedRank ?? 0,
      overrides?.accuracyRank ?? 0,
      overrides?.evasionRank ?? 0,
      overrides?.statusCondition ?? null,
    );
  };

`;
  }
  return '';
}

/**
 * 変数宣言を生成
 */
function generateVariableDeclarations(baseClass: string): string {
  const lines: string[] = [];
  lines.push(`  let pokemon: BattlePokemonStatus;`);
  lines.push(`  let battleContext: BattleContext;`);
  if (baseClass === 'BaseTypeAbsorbEffect') {
    lines.push(`  let mockBattleRepository: jest.Mocked<IBattleRepository>;`);
  }
  return lines.join('\n');
}

/**
 * テストファイルを生成
 */
function generateTestFile(abilityName: string, config: AbilityConfig): string {
  const baseClass = config.baseClass;
  const testClassName = `Test${baseClass.replace('Base', '')}`;
  const imports = generateImports(baseClass, config.category);
  const testClass = generateTestClass(testClassName, baseClass, config.params);
  const helpers = generateHelpers(baseClass);
  const variableDeclarations = generateVariableDeclarations(baseClass);
  const beforeEach = generateBeforeEach(baseClass, config.params);
  const testCases = generateTestCases(baseClass, config.params);

  return `${imports}

${testClass}

describe('${baseClass}', () => {
${helpers}${variableDeclarations}

${beforeEach}

${testCases}
});
`;
}

/**
 * メイン処理
 */
function main() {
  const configPath = path.join(__dirname, '../../config/abilities.json');
  const outputDir = path.join(__dirname, '../modules/pokemon/domain/abilities/effects/base');

  // 設定ファイルを読み込む
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: AbilitiesConfig = JSON.parse(configContent);

  // 設定ファイルから実際のデータを取得（$schemaなどのメタデータを除外）
  const abilities: AbilitiesConfig = {};
  for (const [key, value] of Object.entries(config)) {
    if (!key.startsWith('$') && value && typeof value === 'object' && 'baseClass' in value) {
      abilities[key] = value as AbilityConfig;
    }
  }

  // 各特性についてテストファイルを生成
  for (const [abilityName, abilityConfig] of Object.entries(abilities)) {
    if (!abilityConfig || typeof abilityConfig !== 'object' || !abilityConfig.baseClass) {
      continue;
    }

    const baseClass = abilityConfig.baseClass;
    const baseClassPath = baseClass.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    const testFileName = `${baseClassPath}.spec.ts`;
    const testFilePath = path.join(outputDir, testFileName);

    // テストファイルが既に存在する場合はスキップ
    if (fs.existsSync(testFilePath)) {
      console.log(`Skipped (already exists): ${testFilePath}`);
      continue;
    }

    // テストファイルを生成
    const testContent = generateTestFile(abilityName, abilityConfig);
    fs.writeFileSync(testFilePath, testContent, 'utf-8');
    console.log(`Generated: ${testFilePath}`);
  }
}

// CommonJSモジュールシステムでの直接実行チェック
if (require.main === module) {
  main();
}

