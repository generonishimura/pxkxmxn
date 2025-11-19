import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  NotFoundException,
  ValidationException,
  InvalidStateException,
} from '../../domain/exceptions';

/**
 * ドメイン例外をHTTP例外に変換するフィルター
 * ドメイン層の例外をNest.jsのHTTP例外に変換する
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: HttpStatus;
    let message: string;

    if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof ValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof InvalidStateException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      this.logger.error(`Unhandled domain exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

