import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const FirebaseToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // ⭐ Extraer del header X-Firebase-Token
    const firebaseToken = request.headers['x-firebase-token'];
    
    if (!firebaseToken) {
      throw new Error('Token de Firebase no encontrado en header X-Firebase-Token');
    }
    
    console.log('✅ [FirebaseToken] Token extraído:', firebaseToken.substring(0, 50) + '...');
    return firebaseToken;
  },
);