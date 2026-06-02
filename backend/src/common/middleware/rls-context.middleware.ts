import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { decode } from 'jsonwebtoken';

// Lightweight middleware: decodes (does NOT verify) the Bearer token and stores
// the subject claim on req.rlsUserId.  JwtGuard still performs the cryptographic
// verification later in the pipeline; if the token is invalid the guard throws
// before any DB query runs.
//
// We deliberately do NOT execute SET app.current_user_id here because
// TypeORM's connection pool means dataSource.query() checks out an arbitrary
// pooled connection — a SET on one connection has no effect on the connection
// that the actual query runs on.  Instead, service methods that access
// profile_sensitive_data use withRls() (src/common/database/rls.helper.ts),
// which pins a single QueryRunner connection for the duration of the call and
// issues SET LOCAL inside a transaction, guaranteeing the policy sees the
// correct user context.

export interface RlsRequest extends Request {
  rlsUserId?: string;
}

@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  use(req: RlsRequest, _res: Response, next: NextFunction): void {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const payload = decode(auth.slice(7)) as { sub?: string } | null;
      if (payload?.sub) {
        req.rlsUserId = payload.sub;
      }
    }
    next();
  }
}
