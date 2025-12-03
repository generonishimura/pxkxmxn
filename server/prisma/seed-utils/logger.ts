/**
 * シードスクリプト用のシンプルなログユーティリティ
 * Nest.jsのコンテキスト外で実行されるシードスクリプト用
 *
 * 環境変数 `SEED_LOG_LEVEL` でログレベルを制御可能
 * - 'silent': ログを出力しない
 * - 'error': エラーのみ出力
 * - 'warn': 警告とエラーを出力
 * - 'info': 情報、警告、エラーを出力（デフォルト）
 */

type LogLevel = 'silent' | 'error' | 'warn' | 'info';

const LOG_LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
};

const getLogLevel = (): LogLevel => {
  const envLevel = process.env.SEED_LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info'; // デフォルトはinfo
};

const currentLogLevel = getLogLevel();
const currentLevel = LOG_LEVELS[currentLogLevel];

/**
 * 情報ログを出力
 */
export const log = (message: string, ...args: unknown[]): void => {
  if (currentLevel >= LOG_LEVELS.info) {
    console.log(message, ...args);
  }
};

/**
 * 警告ログを出力
 */
export const warn = (message: string, ...args: unknown[]): void => {
  if (currentLevel >= LOG_LEVELS.warn) {
    console.warn(message, ...args);
  }
};

/**
 * エラーログを出力
 */
export const error = (message: string, ...args: unknown[]): void => {
  if (currentLevel >= LOG_LEVELS.error) {
    console.error(message, ...args);
  }
};

