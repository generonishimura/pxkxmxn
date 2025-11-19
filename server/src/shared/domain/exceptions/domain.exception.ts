/**
 * ドメイン例外の基底クラス
 * ドメイン層で使用する例外の基底クラス
 * Nest.jsに依存しない純粋なTypeScriptクラス
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Error のスタックトレースを正しく保持
    Error.captureStackTrace(this, this.constructor);
  }
}

