import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    console.log('Request in decorator:', user); // Debug
    
    // Si se especifica una propiedad, devolverla
    if (data) {
      return user?.[data];
    }
    
    // Si no, devolver el objeto completo
    return user;
  },
);