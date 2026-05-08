import { type ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authorizationHeader = request.headers['authorization'];

        if (!authorizationHeader) {
            request.authUser = undefined;
            return true;
        }

        request.authUser = await this.verifyAccessToken(authorizationHeader);

        return true;
    }
}
