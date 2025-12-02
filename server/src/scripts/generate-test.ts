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
 * 文字列をエスケープする
 */
function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

    case 'BaseStatBoostEffect':
      if (params.statType) {
        lines.push(`  protected readonly statType = '${params.statType}' as const;`);
      }
      if (params.rankChange !== undefined) {
        lines.push(`  protected readonly rankChange = ${params.rankChange};`);
      }
      break;

    case 'BaseTypeBoostEffect':
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      break;

    case 'BaseHpThresholdEffect':
      if (params.thresholdType) {
        lines.push(`  protected readonly thresholdType = '${params.thresholdType}' as const;`);
      }
      if (params.customThreshold !== undefined) {
        lines.push(`  protected customThreshold = ${params.customThreshold};`);
      }
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      // modifyDamageメソッドをオーバーライド
      if (params.damageMultiplier !== undefined) {
        lines.push(``);
        lines.push(`  modifyDamage(`);
        lines.push(`    pokemon: BattlePokemonStatus,`);
        lines.push(`    damage: number,`);
        lines.push(`    _battleContext?: BattleContext,`);
        lines.push(`  ): number {`);
        lines.push(`    if (!this.checkHpThreshold(pokemon)) {`);
        lines.push(`      return damage;`);
        lines.push(`    }`);
        lines.push(`    return Math.floor(damage * this.damageMultiplier);`);
        lines.push(`  }`);
      }
      break;

    default:
      // その他の基底クラスの場合は、paramsをそのまま出力
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          lines.push(`  protected readonly ${key} = '${escapeString(value)}';`);
        } else if (typeof value === 'number') {
          lines.push(`  protected readonly ${key} = ${value};`);
        } else if (Array.isArray(value)) {
          if (value.length > 0 && value.every(v => typeof v === 'string')) {
            const escaped = value.map(v => `'${escapeString(v)}'`).join(', ');
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
  const testClassName = baseClass.replace('Base', '');

  switch (baseClass) {
    case 'BaseTypeAbsorbEffect':
      lines.push(`  describe('isImmuneToType', () => {`);
      if (params.immuneTypes && Array.isArray(params.immuneTypes) && params.immuneTypes.length > 0) {
        const immuneType = params.immuneTypes[0];
        lines.push(`    it('should return true for immune type', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, '${immuneType}', battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return false for non-immune type', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, 'ほのお', battleContext);`);
        lines.push(`      expect(result).toBe(false);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      lines.push(``);
      lines.push(`  describe('onAfterTakingDamage', () => {`);
      lines.push(`    it('should heal HP when immune type attack is absorbed', async () => {`);
      lines.push(`      const effect = new Test${testClassName}();`);
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
      lines.push(`      const effect = new Test${testClassName}();`);
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
      lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
        if (params.speedMultiplier !== undefined) {
          const expectedSpeed = Math.floor(100 * params.speedMultiplier);
          lines.push(`      const result = effect.modifySpeed(pokemon, 100, battleContext);`);
          lines.push(`      expect(result).toBe(${expectedSpeed}); // 100 * ${params.speedMultiplier} = ${expectedSpeed}`);
        }
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return undefined for non-required weather', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const result = effect.isImmuneToType(pokemon, '${immuneType}', battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return false for non-immune type', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
        if (params.damageMultiplier !== undefined) {
          const expectedDamage = Math.floor(100 * params.damageMultiplier);
          lines.push(`      const result = effect.modifyDamageDealt(pokemon, 100, battleContext);`);
          lines.push(`      expect(result).toBe(${expectedDamage}); // 100 * ${params.damageMultiplier} = ${expectedDamage}`);
        }
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return undefined for non-required weather', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
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
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.${immuneCondition}, battleContext);`);
        lines.push(`      expect(result).toBe(false);`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('should return true for non-immune status condition', () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const result = effect.canReceiveStatusCondition(pokemon, StatusCondition.Burn, battleContext);`);
        lines.push(`      expect(result).toBe(true);`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseOpponentStatChangeEffect':
      lines.push(`  describe('onEntry', () => {`);
      lines.push(`    it('battleContextがない場合、何も実行しない', async () => {`);
      lines.push(`      const effect = new Test${testClassName}();`);
      lines.push(`      await effect.onEntry(pokemon, undefined);`);
      lines.push(`      expect(true).toBe(true);`);
      lines.push(`    });`);
      lines.push(``);
      lines.push(`    it('battleRepositoryがない場合、何も実行しない', async () => {`);
      lines.push(`      const effect = new Test${testClassName}();`);
      lines.push(`      const contextWithoutRepository: BattleContext = {`);
      lines.push(`        battle: createBattle(),`);
      lines.push(`      };`);
      lines.push(`      await effect.onEntry(pokemon, contextWithoutRepository);`);
      lines.push(`      expect(true).toBe(true);`);
      lines.push(`    });`);
      lines.push(``);
      if (params.statType && params.rankChange !== undefined) {
        const statPropMap: Record<string, string> = {
          attack: 'attackRank',
          defense: 'defenseRank',
          specialAttack: 'specialAttackRank',
          specialDefense: 'specialDefenseRank',
          speed: 'speedRank',
          accuracy: 'accuracyRank',
          evasion: 'evasionRank',
        };
        const statProp = statPropMap[params.statType] || 'attackRank';
        const newRank = params.rankChange > 0 ? params.rankChange : 0;
        lines.push(`    it('正常に相手の${statProp}を${params.rankChange > 0 ? '+' : ''}${params.rankChange}段階${params.rankChange > 0 ? '上げる' : '下げる'}', async () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const pokemonWithTrainerId = createBattlePokemonStatus({ trainerId: 1 });`);
        lines.push(`      const opponentPokemon = createBattlePokemonStatus({`);
        lines.push(`        id: 2,`);
        lines.push(`        trainerId: 2,`);
        lines.push(`        ${statProp}: 0,`);
        lines.push(`      });`);
        lines.push(`      const battleRepository = createMockBattleRepository();`);
        lines.push(`      battleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentPokemon);`);
        lines.push(`      battleRepository.updateBattlePokemonStatus.mockResolvedValue(`);
        lines.push(`        createBattlePokemonStatus({ id: 2, ${statProp}: ${newRank} }),`);
        lines.push(`      );`);
        lines.push(`      const battleContext: BattleContext = {`);
        lines.push(`        battle: createBattle({ trainer1Id: 1, trainer2Id: 2 }),`);
        lines.push(`        battleRepository,`);
        lines.push(`      };`);
        lines.push(``);
        lines.push(`      await effect.onEntry(pokemonWithTrainerId, battleContext);`);
        lines.push(``);
        lines.push(`      expect(battleRepository.findActivePokemonByBattleIdAndTrainerId).toHaveBeenCalledWith(1, 2);`);
        lines.push(`      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(2, {`);
        lines.push(`        ${statProp}: ${newRank},`);
        lines.push(`      });`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseStatBoostEffect':
      lines.push(`  describe('onEntry', () => {`);
      lines.push(`    it('battleContextがない場合、何も実行しない', async () => {`);
      lines.push(`      const effect = new Test${testClassName}();`);
      lines.push(`      await effect.onEntry(pokemon, undefined);`);
      lines.push(`      expect(true).toBe(true);`);
      lines.push(`    });`);
      lines.push(``);
      lines.push(`    it('battleRepositoryがない場合、何も実行しない', async () => {`);
      lines.push(`      const effect = new Test${testClassName}();`);
      lines.push(`      const contextWithoutRepository: BattleContext = {`);
      lines.push(`        battle: createBattle(),`);
      lines.push(`      };`);
      lines.push(`      await effect.onEntry(pokemon, contextWithoutRepository);`);
      lines.push(`      expect(true).toBe(true);`);
      lines.push(`    });`);
      lines.push(``);
      if (params.statType && params.rankChange !== undefined) {
        const statPropMap: Record<string, string> = {
          attack: 'attackRank',
          defense: 'defenseRank',
          specialAttack: 'specialAttackRank',
          specialDefense: 'specialDefenseRank',
          speed: 'speedRank',
          accuracy: 'accuracyRank',
          evasion: 'evasionRank',
        };
        const statProp = statPropMap[params.statType] || 'attackRank';
        const newRank = params.rankChange > 0 ? params.rankChange : 0;
        lines.push(`    it('正常に自分の${statProp}を${params.rankChange > 0 ? '+' : ''}${params.rankChange}段階${params.rankChange > 0 ? '上げる' : '下げる'}', async () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const pokemonWithRank = createBattlePokemonStatus({`);
        lines.push(`        id: 1,`);
        lines.push(`        ${statProp}: 0,`);
        lines.push(`      });`);
        lines.push(`      const battleRepository = createMockBattleRepository();`);
        lines.push(`      battleRepository.updateBattlePokemonStatus.mockResolvedValue(`);
        lines.push(`        createBattlePokemonStatus({ id: 1, ${statProp}: ${newRank} }),`);
        lines.push(`      );`);
        lines.push(`      const battleContext: BattleContext = {`);
        lines.push(`        battle: createBattle(),`);
        lines.push(`        battleRepository,`);
        lines.push(`      };`);
        lines.push(``);
        lines.push(`      await effect.onEntry(pokemonWithRank, battleContext);`);
        lines.push(``);
        lines.push(`      expect(battleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {`);
        lines.push(`        ${statProp}: ${newRank},`);
        lines.push(`      });`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseTypeBoostEffect':
      lines.push(`  describe('modifyDamageDealt', () => {`);
      if (params.damageMultiplier !== undefined) {
        const expectedDamage = Math.floor(100 * params.damageMultiplier);
        lines.push(`    it('タイプ一致の場合、ダメージが${params.damageMultiplier}倍になる', async () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const pokemonWithTrainedId = createBattlePokemonStatus({ trainedPokemonId: 1 });`);
        lines.push(`      const fireType = createType(1, 'ほのお');`);
        lines.push(`      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));`);
        lines.push(`      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);`);
        lines.push(`      const battleContext: BattleContext = {`);
        lines.push(`        battle: createBattle(),`);
        lines.push(`        trainedPokemonRepository,`);
        lines.push(`        moveTypeName: 'ほのお',`);
        lines.push(`      };`);
        lines.push(``);
        lines.push(`      const result = await effect.modifyDamageDealt(pokemonWithTrainedId, 100, battleContext);`);
        lines.push(``);
        lines.push(`      expect(result).toBe(${expectedDamage}); // 100 * ${params.damageMultiplier} = ${expectedDamage}`);
        lines.push(`    });`);
        lines.push(``);
        lines.push(`    it('タイプ不一致の場合、undefinedを返す', async () => {`);
        lines.push(`      const effect = new Test${testClassName}();`);
        lines.push(`      const pokemonWithTrainedId = createBattlePokemonStatus({ trainedPokemonId: 1 });`);
        lines.push(`      const fireType = createType(1, 'ほのお');`);
        lines.push(`      const waterType = createType(2, 'みず');`);
        lines.push(`      const trainedPokemon = createTrainedPokemon(1, createPokemon(1, fireType));`);
        lines.push(`      const trainedPokemonRepository = createMockTrainedPokemonRepository(trainedPokemon);`);
        lines.push(`      const battleContext: BattleContext = {`);
        lines.push(`        battle: createBattle(),`);
        lines.push(`        trainedPokemonRepository,`);
        lines.push(`        moveTypeName: 'みず',`);
        lines.push(`      };`);
        lines.push(``);
        lines.push(`      const result = await effect.modifyDamageDealt(pokemonWithTrainedId, 100, battleContext);`);
        lines.push(``);
        lines.push(`      expect(result).toBeUndefined();`);
        lines.push(`    });`);
      }
      lines.push(`  });`);
      break;

    case 'BaseHpThresholdEffect':
      lines.push(`  describe('checkHpThreshold', () => {`);
      if (params.thresholdType) {
        if (params.thresholdType === 'full') {
          lines.push(`    it('HPが満タンの場合、trueを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonFullHp = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonFullHp);`);
          lines.push(`      expect(result).toBe(true);`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが満タンでない場合、falseを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonNotFullHp = createBattlePokemonStatus({ currentHp: 99, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonNotFullHp);`);
          lines.push(`      expect(result).toBe(false);`);
          lines.push(`    });`);
        } else if (params.thresholdType === 'half') {
          lines.push(`    it('HPが半分以下の場合、trueを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonHalfHp = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonHalfHp);`);
          lines.push(`      expect(result).toBe(true);`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが半分より多い場合、falseを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonMoreThanHalfHp = createBattlePokemonStatus({ currentHp: 51, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonMoreThanHalfHp);`);
          lines.push(`      expect(result).toBe(false);`);
          lines.push(`    });`);
        } else if (params.thresholdType === 'third') {
          lines.push(`    it('HPが1/3以下の場合、trueを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonThirdHp = createBattlePokemonStatus({ currentHp: 33, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonThirdHp);`);
          lines.push(`      expect(result).toBe(true);`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが1/3より多い場合、falseを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonMoreThanThirdHp = createBattlePokemonStatus({ currentHp: 34, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonMoreThanThirdHp);`);
          lines.push(`      expect(result).toBe(false);`);
          lines.push(`    });`);
        } else if (params.thresholdType === 'quarter') {
          lines.push(`    it('HPが1/4以下の場合、trueを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonQuarterHp = createBattlePokemonStatus({ currentHp: 25, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonQuarterHp);`);
          lines.push(`      expect(result).toBe(true);`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが1/4より多い場合、falseを返す', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonMoreThanQuarterHp = createBattlePokemonStatus({ currentHp: 26, maxHp: 100 });`);
          lines.push(`      const result = effect['checkHpThreshold'](pokemonMoreThanQuarterHp);`);
          lines.push(`      expect(result).toBe(false);`);
          lines.push(`    });`);
        }
      }
      lines.push(`  });`);
      if (params.damageMultiplier !== undefined) {
        lines.push(``);
        lines.push(`  describe('modifyDamage', () => {`);
        if (params.thresholdType === 'full') {
          const expectedDamage = Math.floor(100 * params.damageMultiplier);
          lines.push(`    it('HPが満タンの場合、ダメージが${params.damageMultiplier}倍になる', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonFullHp = createBattlePokemonStatus({ currentHp: 100, maxHp: 100 });`);
          lines.push(`      const result = effect.modifyDamage(pokemonFullHp, 100);`);
          lines.push(`      expect(result).toBe(${expectedDamage});`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが満タンでない場合、ダメージが変更されない', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonNotFullHp = createBattlePokemonStatus({ currentHp: 99, maxHp: 100 });`);
          lines.push(`      const result = effect.modifyDamage(pokemonNotFullHp, 100);`);
          lines.push(`      expect(result).toBe(100);`);
          lines.push(`    });`);
        } else if (params.thresholdType === 'half') {
          const expectedDamage = Math.floor(100 * params.damageMultiplier);
          lines.push(`    it('HPが半分以下の場合、ダメージが${params.damageMultiplier}倍になる', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonHalfHp = createBattlePokemonStatus({ currentHp: 50, maxHp: 100 });`);
          lines.push(`      const result = effect.modifyDamage(pokemonHalfHp, 100);`);
          lines.push(`      expect(result).toBe(${expectedDamage});`);
          lines.push(`    });`);
          lines.push(``);
          lines.push(`    it('HPが半分より多い場合、ダメージが変更されない', () => {`);
          lines.push(`      const effect = new Test${testClassName}();`);
          lines.push(`      const pokemonMoreThanHalfHp = createBattlePokemonStatus({ currentHp: 51, maxHp: 100 });`);
          lines.push(`      const result = effect.modifyDamage(pokemonMoreThanHalfHp, 100);`);
          lines.push(`      expect(result).toBe(100);`);
          lines.push(`    });`);
        }
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
function generateImports(baseClass: string): string {
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
  } else if (
    baseClass === 'BaseTypeAbsorbEffect' ||
    baseClass === 'BaseOpponentStatChangeEffect' ||
    baseClass === 'BaseStatBoostEffect'
  ) {
    imports.push(`import { Weather, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';`);
    imports.push(`import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';`);
  } else if (baseClass === 'BaseTypeAbsorbAndBoostEffect') {
    imports.push(`import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
  } else if (baseClass === 'BaseTypeBoostEffect') {
    imports.push(`import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';`);
    imports.push(`import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';`);
    imports.push(`import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';`);
    imports.push(`import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';`);
    imports.push(`import { Type } from '@/modules/pokemon/domain/entities/type.entity';`);
    imports.push(`import { Ability } from '@/modules/pokemon/domain/entities/ability.entity';`);
    imports.push(`import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';`);
    imports.push(`import { Nature } from '@/modules/battle/domain/logic/stat-calculator';`);
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
  } else if (baseClass === 'BaseOpponentStatChangeEffect' || baseClass === 'BaseStatBoostEffect') {
    lines.push(`    mockBattleRepository = createMockBattleRepository();`);
    lines.push(`    battleContext = {`);
    lines.push(`      battle: createBattle(),`);
    lines.push(`      battleRepository: mockBattleRepository,`);
    lines.push(`    };`);
  } else if (baseClass === 'BaseTypeBoostEffect') {
    lines.push(`    battleContext = {`);
    lines.push(`      battle: createBattle(),`);
    lines.push(`    };`);
  } else if (baseClass === 'BaseHpThresholdEffect') {
    // BaseHpThresholdEffectはbattleContextを必要としない
    lines.push(`    battleContext = undefined;`);
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
  if (baseClass === 'BaseOpponentStatChangeEffect' || baseClass === 'BaseStatBoostEffect') {
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

  const createBattle = (overrides?: Partial<Battle>): Battle => {
    return new Battle(
      overrides?.id ?? 1,
      overrides?.trainer1Id ?? 1,
      overrides?.trainer2Id ?? 2,
      overrides?.team1Id ?? 1,
      overrides?.team2Id ?? 2,
      overrides?.turn ?? 1,
      overrides?.weather ?? null,
      overrides?.field ?? null,
      overrides?.status ?? BattleStatus.Active,
      overrides?.winnerTrainerId ?? null,
    );
  };

  const createMockBattleRepository = (): jest.Mocked<IBattleRepository> => {
    return {
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
    };
  };

`;
  }
  if (baseClass === 'BaseTypeBoostEffect') {
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

  const createBattle = (overrides?: Partial<Battle>): Battle => {
    return new Battle(
      overrides?.id ?? 1,
      overrides?.trainer1Id ?? 1,
      overrides?.trainer2Id ?? 2,
      overrides?.team1Id ?? 1,
      overrides?.team2Id ?? 2,
      overrides?.turn ?? 1,
      overrides?.weather ?? null,
      overrides?.field ?? null,
      overrides?.status ?? BattleStatus.Active,
      overrides?.winnerTrainerId ?? null,
    );
  };

  const createType = (id: number, name: string = \`Type\${id}\`, nameEn: string = \`Type\${id}En\`): Type => {
    return new Type(id, name, nameEn);
  };

  const createPokemon = (
    id: number,
    primaryType: Type,
    secondaryType: Type | null = null,
  ): Pokemon => {
    return new Pokemon(
      id,
      1,
      'TestPokemon',
      'TestPokemon',
      primaryType,
      secondaryType,
      100,
      100,
      100,
      100,
      100,
      100,
    );
  };

  const createTrainedPokemon = (
    id: number,
    pokemon: Pokemon,
    ability: Ability | null = null,
  ): TrainedPokemon => {
    return new TrainedPokemon(
      id,
      1,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      ability,
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );
  };

  const createMockTrainedPokemonRepository = (
    trainedPokemon: TrainedPokemon | null,
  ): jest.Mocked<ITrainedPokemonRepository> => {
    return {
      findById: jest.fn().mockResolvedValue(trainedPokemon),
      findByTrainerId: jest.fn(),
    };
  };

`;
  }
  if (
    baseClass === 'BaseConditionalDamageEffect' ||
    baseClass === 'BaseHpThresholdEffect'
  ) {
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
  if (
    baseClass === 'BaseTypeAbsorbEffect' ||
    baseClass === 'BaseOpponentStatChangeEffect' ||
    baseClass === 'BaseStatBoostEffect'
  ) {
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
  const imports = generateImports(baseClass);
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

