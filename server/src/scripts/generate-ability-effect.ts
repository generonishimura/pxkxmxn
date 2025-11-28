#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * 特性効果クラス生成スクリプト
 * config/abilities.jsonから特性効果クラスを自動生成
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
 * 基底クラス名をケバブケースに変換
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * クラス名を生成（特性名から）
 * @param abilityName 特性名（日本語）
 * @param config 特性設定（classNameが指定されている場合はそれを使用）
 * @returns 生成されるクラス名
 */
function generateClassName(abilityName: string, config?: AbilityConfig): string {
  // 設定ファイルにclassNameが指定されている場合はそれを使用
  if (config?.className) {
    return config.className;
  }

  // 日本語名を英語名に変換する簡易的なマッピング（フォールバック）
  // 新しい特性を追加する場合は、設定ファイルにclassNameを指定することを推奨
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

  // フォールバック: 特性名をそのまま使用
  return `${abilityName}Effect`;
}

/**
 * パラメータをTypeScriptコードに変換
 */
function generateParamsCode(params: Record<string, any>, baseClass: string): string {
  const lines: string[] = [];

  // 基底クラスに応じたパラメータの生成
  switch (baseClass) {
    case 'BaseTypeAbsorbEffect':
      if (params.immuneTypes) {
        lines.push(`  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`);
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
        // 数値が整数の場合は小数点以下を表示（一貫性のため）
        const multiplier = Number.isInteger(params.speedMultiplier)
          ? `${params.speedMultiplier}.0`
          : params.speedMultiplier;
        lines.push(`  protected readonly speedMultiplier = ${multiplier};`);
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

    case 'BaseStatBoostEffect':
      if (params.statType) {
        lines.push(`  protected readonly statType = '${params.statType}' as const;`);
      }
      if (params.rankChange !== undefined) {
        lines.push(`  protected readonly rankChange = ${params.rankChange};`);
      }
      break;

    case 'BaseTypeImmunityEffect':
      if (params.immuneTypes) {
        lines.push(`  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`);
      }
      break;

    case 'BaseTypeDependentDamageEffect':
      if (params.affectedTypes) {
        lines.push(`  protected readonly affectedTypes = ${JSON.stringify(params.affectedTypes)} as const;`);
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

    case 'BaseWeatherEffect':
      if (params.weather) {
        lines.push(`  protected readonly weather = Weather.${params.weather};`);
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

    case 'BaseTypeAbsorbAndBoostEffect':
      if (params.immuneTypes) {
        lines.push(`  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)} as const;`);
      }
      if (params.damageMultiplier !== undefined) {
        lines.push(`  protected readonly damageMultiplier = ${params.damageMultiplier};`);
      }
      break;

    default:
      // その他の基底クラスの場合は、paramsをそのまま出力
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          lines.push(`  protected readonly ${key} = '${value}';`);
        } else if (typeof value === 'number') {
          lines.push(`  protected readonly ${key} = ${value};`);
        } else if (Array.isArray(value)) {
          lines.push(`  protected readonly ${key} = ${JSON.stringify(value)} as const;`);
        } else {
          lines.push(`  protected readonly ${key} = ${JSON.stringify(value)};`);
        }
      }
      break;
  }

  return lines.join('\n');
}

/**
 * 必要なインポートを生成
 */
function generateImports(baseClass: string): string {
  const imports: string[] = [];

  // 基底クラスのインポート（ケバブケースに変換）
  const baseClassPath = toKebabCase(baseClass);
  imports.push(`import { ${baseClass} } from '../base/${baseClassPath}';`);

  // Weatherが必要な場合
  if (
    baseClass === 'BaseWeatherDependentSpeedEffect' ||
    baseClass === 'BaseWeatherDependentDamageEffect' ||
    baseClass === 'BaseWeatherEffect'
  ) {
    imports.push(`import { Weather } from '@/modules/battle/domain/entities/battle.entity';`);
  }

  return imports.join('\n');
}

/**
 * クラスファイルを生成
 */
function generateClassFile(abilityName: string, config: AbilityConfig): string {
  const className = generateClassName(abilityName, config);
  const imports = generateImports(config.baseClass);
  const paramsCode = generateParamsCode(config.params, config.baseClass);

  const description = config.descriptionEn
    ? `${config.description} (${config.descriptionEn})`
    : config.description;

  return `${imports}

/**
 * ${abilityName}（${className.replace('Effect', '')}）特性の効果
 * ${description}
 */
export class ${className} extends ${config.baseClass} {
${paramsCode}
}
`;
}

/**
 * レジストリ登録コードを生成
 */
function generateRegistryCode(abilityName: string, className: string): string {
  return `      this.registry.set('${abilityName}', new ${className}());`;
}

/**
 * メイン処理
 */
function main() {
  const configPath = path.join(__dirname, '../../config/abilities.json');
  const outputDir = path.join(__dirname, '../modules/pokemon/domain/abilities/effects');

  // 設定ファイルを読み込む
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: AbilitiesConfig = JSON.parse(configContent);

  // 設定ファイルから実際のデータを取得（$schemaなどのメタデータを除外）
  // JSONスキーマの標準キーワード（$で始まるキー）を除外し、
  // baseClassプロパティを持つオブジェクトのみを処理対象とする
  const abilities: AbilitiesConfig = {};
  for (const [key, value] of Object.entries(config)) {
    // JSONスキーマの標準キーワード（$で始まる）を除外
    if (!key.startsWith('$') && value && typeof value === 'object' && 'baseClass' in value) {
      abilities[key] = value as AbilityConfig;
    }
  }

  const registryLines: string[] = [];
  const imports: string[] = [];

  // 各特性についてクラスファイルを生成
  for (const [abilityName, abilityConfig] of Object.entries(abilities)) {
    if (!abilityConfig || typeof abilityConfig !== 'object' || !abilityConfig.baseClass) {
      continue;
    }

    const className = generateClassName(abilityName, abilityConfig);
    const category = abilityConfig.category || 'other';
    const categoryDir = path.join(outputDir, category);

    // カテゴリディレクトリが存在しない場合は作成
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    // クラスファイルを生成
    const classContent = generateClassFile(abilityName, abilityConfig);
    // クラス名をケバブケースに変換してファイル名を生成
    const fileNameBase = toKebabCase(className.replace('Effect', ''));
    const classFileName = `${fileNameBase}-effect.ts`;
    const classFilePath = path.join(categoryDir, classFileName);

    // ファイルが存在しない場合のみ生成（既存ファイルを上書きしない）
    if (!fs.existsSync(classFilePath)) {
      fs.writeFileSync(classFilePath, classContent, 'utf-8');
      console.log(`Generated: ${classFilePath}`);
    } else {
      console.log(`Skipped (already exists): ${classFilePath}`);
    }

    // レジストリ登録コードを生成
    const importPath = `./effects/${category}/${fileNameBase}-effect`;
    imports.push(`import { ${className} } from '${importPath}';`);
    registryLines.push(generateRegistryCode(abilityName, className));
  }

  // レジストリ登録コードを出力
  console.log('\n=== Registry Registration Code ===');
  console.log('Add these imports to ability-registry.ts:');
  console.log(imports.join('\n'));
  console.log('\nAdd these lines to AbilityRegistry.initialize():');
  console.log(registryLines.join('\n'));
}

if (require.main === module) {
  main();
}

