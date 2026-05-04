import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse = exception instanceof HttpException
            ? exception.getResponse()
            : null;

        const message = typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? (exceptionResponse as any).message ?? 'Internal server error'
            : exceptionResponse ?? 'Internal server error';

        const error = typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? (exceptionResponse as any).error ?? HttpStatus[status]
            : HttpStatus[status];

        this.logger.error(
            `${new Date().toISOString()} | ${request.method} ${request.url} | ${status} | userId:${(request['user'] as any)?.sub ?? 'unauthenticated'} | ${Array.isArray(message) ? message.join(', ') : message}`,
        );

        response.status(status).json({
            statusCode: status,
            error,
            message,
        });
    }
}
