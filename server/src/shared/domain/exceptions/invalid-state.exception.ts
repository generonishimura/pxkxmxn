import { DomainException } from './domain.exception';

/**
 * 無効な状態の例外
 * 例: バトルがアクティブでない状態でターンを実行しようとした場合
 */
export class InvalidStateException extends DomainException {
  constructor(message: string, public readonly currentState?: string) {
    super(message);
  }
}

