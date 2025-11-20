import { DomainException } from './domain.exception';

/**
 * バリデーションエラーの例外
 */
export class ValidationException extends DomainException {
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

