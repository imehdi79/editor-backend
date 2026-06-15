import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Global filter producing a consistent error envelope for every 4xx/5xx:
 *
 *   { "error": { "message": string, "issues"?: string[] } }
 *
 * Validation failures (from the global ValidationPipe) arrive as a
 * BadRequestException whose response carries a `message: string[]`; those are
 * surfaced under `issues` with a generic top-level message.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let issues: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as { message?: string | string[]; error?: string };
        if (Array.isArray(body.message)) {
          // class-validator output: one string per failed constraint.
          issues = body.message;
          message = 'Validation failed';
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else if (typeof body.error === 'string') {
          message = body.error;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, (exception as Error)?.stack);
    }

    void reply
      .status(status)
      .send({ error: { message, ...(issues ? { issues } : {}) } });
  }
}
