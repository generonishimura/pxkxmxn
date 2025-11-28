#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * 技効果クラス生成スクリプト
 * config/moves.jsonから技効果クラスを自動生成
 */

interface MoveConfig {
  baseClass: string;
  params: Record<string, any>;
  description: string;
  descriptionEn?: string;
  className?: string;
}

interface MovesConfig {
  [moveName: string]: MoveConfig;
}

/**
 * クラス名を生成（技名から）
 * @param moveName 技名（日本語）
 * @param config 技設定（classNameが指定されている場合はそれを使用）
 * @returns 生成されるクラス名
 */
function generateClassName(moveName: string, config?: MoveConfig): string {
  // 設定ファイルにclassNameが指定されている場合はそれを使用
  if (config?.className) {
    return config.className;
  }

  // 日本語名を英語名に変換する簡易的なマッピング（フォールバック）
  // 新しい技を追加する場合は、設定ファイルにclassNameを指定することを推奨
  const nameMap: Record<string, string> = {
    かえんほうしゃ: 'Flamethrower',
    '10まんボルト': 'Thunderbolt',
    どくどく: 'Toxic',
    れいとうビーム: 'IceBeam',
    ねむりごな: 'SleepPowder',
  };

  if (nameMap[moveName]) {
    return `${nameMap[moveName]}Effect`;
  }

  // フォールバック: 技名をそのまま使用
  return `${moveName}Effect`;
}

/**
 * パラメータをTypeScriptコードに変換
 */
function generateParamsCode(params: Record<string, any>, baseClass: string): string {
  const lines: string[] = [];

  switch (baseClass) {
    case 'BaseStatusConditionEffect':
      if (params.statusCondition) {
        lines.push(`  protected readonly statusCondition = StatusCondition.${params.statusCondition};`);
      }
      if (params.chance !== undefined) {
        lines.push(`  protected readonly chance = ${params.chance};`);
      }
      if (params.immuneTypes) {
        lines.push(`  protected readonly immuneTypes = ${JSON.stringify(params.immuneTypes)};`);
      }
      if (params.message) {
        lines.push(`  protected readonly message = '${params.message}';`);
      }
      break;

    case 'BaseRecoilEffect':
      if (params.recoilRatio !== undefined) {
        lines.push(`  protected readonly recoilRatio = ${params.recoilRatio};`);
      }
      break;

    case 'BaseMultiHitEffect':
      if (params.hitCount) {
        if (typeof params.hitCount === 'number') {
          lines.push(`  protected readonly hitCount = ${params.hitCount};`);
        } else {
          // 範囲の場合（例: [2, 5]）
          lines.push(`  protected readonly hitCount = [${params.hitCount[0]}, ${params.hitCount[1]}] as const;`);
        }
      }
      break;

    default:
      // その他の基底クラスの場合は、paramsをそのまま出力
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          // 文字列のエスケープ処理
          const escaped = value.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
          lines.push(`  protected readonly ${key} = '${escaped}';`);
        } else if (typeof value === 'number') {
          lines.push(`  protected readonly ${key} = ${value};`);
        } else if (Array.isArray(value)) {
          // 配列の要素が文字列の場合は個別にエスケープ
          if (value.length > 0 && value.every((v) => typeof v === 'string')) {
            const escaped = value.map((v) => `'${v.replace(/'/g, "\\'").replace(/\\/g, '\\\\')}'`).join(', ');
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

  return lines.join('\n');
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
 * 必要なインポートを生成
 */
function generateImports(baseClass: string): string {
  const imports: string[] = [];

  // 基底クラスのインポート
  // BaseStatusConditionEffectは、既存のファイル構造に合わせて
  // base/ディレクトリではなく、effects/ディレクトリ直下に配置されているため、
  // 特別なインポートパスを使用する
  if (baseClass === 'BaseStatusConditionEffect') {
    imports.push(`import { ${baseClass} } from './base-status-condition-effect';`);
  } else {
    const baseClassPath = toKebabCase(baseClass);
    imports.push(`import { ${baseClass} } from './base/${baseClassPath}';`);
  }

  // StatusConditionが必要な場合
  if (baseClass === 'BaseStatusConditionEffect') {
    imports.push(`import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';`);
  }

  return imports.join('\n');
}

/**
 * クラスファイルを生成
 */
function generateClassFile(moveName: string, config: MoveConfig): string {
  const className = generateClassName(moveName, config);
  const imports = generateImports(config.baseClass);
  const paramsCode = generateParamsCode(config.params, config.baseClass);

  const description = config.descriptionEn
    ? `${config.description} (${config.descriptionEn})`
    : config.description;

  return `${imports}

/**
 * 「${moveName}」の特殊効果実装
 *
 * 効果: ${description}
 */
export class ${className} extends ${config.baseClass} {
${paramsCode}
}
`;
}

/**
 * レジストリ登録コードを生成
 */
function generateRegistryCode(moveName: string, className: string): string {
  return `      this.registry.set('${moveName}', new ${className}());`;
}

/**
 * メイン処理
 */
function main() {
  const configPath = path.join(__dirname, '../../config/moves.json');
  const outputDir = path.join(__dirname, '../modules/pokemon/domain/moves/effects');

  // 設定ファイルを読み込む
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: MovesConfig = JSON.parse(configContent);

  // 設定ファイルから実際のデータを取得（$schemaなどのメタデータを除外）
  // JSONスキーマの標準キーワード（$で始まるキー）を除外し、
  // baseClassプロパティを持つオブジェクトのみを処理対象とする
  const moves: MovesConfig = {};
  for (const [key, value] of Object.entries(config)) {
    // JSONスキーマの標準キーワード（$で始まる）を除外
    if (!key.startsWith('$') && value && typeof value === 'object' && 'baseClass' in value) {
      moves[key] = value as MoveConfig;
    }
  }

  const registryLines: string[] = [];
  const imports: string[] = [];

  // 各技についてクラスファイルを生成
  for (const [moveName, moveConfig] of Object.entries(moves)) {
    if (!moveConfig || typeof moveConfig !== 'object' || !moveConfig.baseClass) {
      continue;
    }

    const className = generateClassName(moveName, moveConfig);

    // クラスファイルを生成
    const classContent = generateClassFile(moveName, moveConfig);
    // クラス名をケバブケースに変換してファイル名を生成
    const fileNameBase = toKebabCase(className.replace('Effect', ''));
    const classFileName = `${fileNameBase}-effect.ts`;
    const classFilePath = path.join(outputDir, classFileName);

    // ファイルが存在しない場合のみ生成
    if (!fs.existsSync(classFilePath)) {
      fs.writeFileSync(classFilePath, classContent, 'utf-8');
      console.log(`Generated: ${classFilePath}`);
    } else {
      console.log(`Skipped (already exists): ${classFilePath}`);
    }

    // レジストリ登録コードを生成
    const importPath = `./effects/${fileNameBase}-effect`;
    imports.push(`import { ${className} } from '${importPath}';`);
    registryLines.push(generateRegistryCode(moveName, className));
  }

  // レジストリ登録コードを出力
  console.log('\n=== Registry Registration Code ===');
  console.log('Add these imports to move-registry.ts:');
  console.log(imports.join('\n'));
  console.log('\nAdd these lines to MoveRegistry.initialize():');
  console.log(registryLines.join('\n'));
}

// CommonJSモジュールシステムでの直接実行チェック
// 注意: package.jsonで"type": "commonjs"が指定されているため、このパターンは有効
// 将来的にES modulesに移行する場合は、import.meta.urlを使用した判定に変更する必要がある
if (require.main === module) {
  main();
}

