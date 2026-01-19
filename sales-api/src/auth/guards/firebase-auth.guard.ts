import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no encontrado');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // ⭐ Guardar el token ORIGINAL
    request.originalFirebaseToken = token;
    console.log('💾 [FirebaseAuthGuard] Token guardado:', token.substring(0, 50) + '...');

    try {
      // Validar el token con Firebase
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Agregar el usuario al request
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
      
      console.log('✅ [FirebaseAuthGuard] Token válido, usuario:', request.user.uid);
      return true;
    } catch (error) {
      console.error('❌ [FirebaseAuthGuard] Error validando token:', error.message);
      throw new UnauthorizedException('Token inválido');
    }
  }
}