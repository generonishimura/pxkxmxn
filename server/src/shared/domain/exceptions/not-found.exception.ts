import { DomainException } from './domain.exception';

/**
 * リソースが見つからない場合の例外
 */
export class NotFoundException extends DomainException {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message);
  }
}

