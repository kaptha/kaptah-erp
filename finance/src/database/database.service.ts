import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async runQuery(query: string, parameters?: any[]) {
    try {
      this.logger.debug(`Executing query: ${query}`);
      this.logger.debug(`Parameters: ${JSON.stringify(parameters)}`);
      
      const result = await this.dataSource.query(query, parameters);
      
      this.logger.debug(`Query result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Database error: ${error.message}`);
      this.logger.error(`Query: ${query}`);
      this.logger.error(`Parameters: ${JSON.stringify(parameters)}`);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}
