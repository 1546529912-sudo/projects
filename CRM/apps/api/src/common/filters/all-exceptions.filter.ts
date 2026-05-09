import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ERROR_CODES } from '../types/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as { message?: string; code?: number } | string;
      const message = typeof body === 'string' ? body : body.message ?? exception.message;
      const code = typeof body === 'object' && body.code ? body.code : this.mapStatus(status);
      return response.status(status).json({ code, message, data: null });
    }

    this.logger.error(
      exception instanceof Error ? exception.stack ?? exception.message : String(exception),
    );

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '系统内部错误',
      data: null,
    });
  }

  private mapStatus(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) return ERROR_CODES.UNAUTHORIZED;
    if (status === HttpStatus.FORBIDDEN) return ERROR_CODES.FORBIDDEN;
    if (status === HttpStatus.NOT_FOUND) return ERROR_CODES.NOT_FOUND;
    if (status === HttpStatus.BAD_REQUEST) return ERROR_CODES.VALIDATION_FAILED;
    return ERROR_CODES.INTERNAL_ERROR;
  }
}
