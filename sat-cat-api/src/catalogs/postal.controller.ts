import { Controller, Get, Query, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colonia } from './postal/entities/colonia.entity';
import { PostalService } from './postal.service';

@Controller('postal')
export class PostalController {
  constructor(private readonly postalService: PostalService,
    @InjectRepository(Colonia)
    private readonly coloniaRepository: Repository<Colonia>
  ) {}

  @Get('buscar-codigos')
async buscarCodigosPostales(@Query('prefijo') prefijo: string) {
  console.log('Recibida solicitud para prefijo:', prefijo);
  try {
    const resultado = await this.postalService.buscarCodigosPostales(prefijo);
    console.log('Resultado obtenido:', resultado);
    return resultado;
  } catch (error) {
    console.error('Error en buscarCodigosPostales:', error);
    throw new InternalServerErrorException('Error procesando la solicitud');
  }
}

@Get('buscar-colonias')
async buscarColonias(@Query('codigoPostal') codigoPostal: string): Promise<string[]> {
  const colonias = await this.coloniaRepository.find({
    where: { codigoPostal },
    order: { nombre: 'ASC' },
    select: ['nombre']
  });
  return colonias.map(colonia => colonia.nombre);
}
}
