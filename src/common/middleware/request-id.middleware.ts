import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existingRequestId = (req.headers?.['x-request-id'] ||
      req.headers?.['X-Request-ID']) as string;

    const requestId = existingRequestId || this.generateRequestId();

    (req as any).requestId = requestId;

    res.setHeader('X-Request-ID', requestId);

    next();
  }

  private generateRequestId(): string {
    const randomString = randomBytes(8).toString('hex');
    return `req_${randomString}`;
  }
}
