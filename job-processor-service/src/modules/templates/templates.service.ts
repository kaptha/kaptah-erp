import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  onModuleInit() {
    this.loadTemplates();
  }

  private loadTemplates() {
    // La ruta correcta es desde donde está compilado el archivo
    const templatesDir = path.join(__dirname, 'views');

    this.logger.log(`===========================================`);
    this.logger.log(`Attempting to load templates...`);
    this.logger.log(`Current __dirname: ${__dirname}`);
    this.logger.log(`Templates directory: ${templatesDir}`);
    this.logger.log(`===========================================`);

    try {
      // Verificar si el directorio existe
      if (!fs.existsSync(templatesDir)) {
        this.logger.error(`❌ Templates directory DOES NOT EXIST: ${templatesDir}`);
        this.logger.log(`Trying alternative path...`);
        
        // Intentar ruta alternativa (desarrollo)
        const altPath = path.join(process.cwd(), 'src', 'modules', 'templates', 'views');
        this.logger.log(`Alternative path: ${altPath}`);
        
        if (fs.existsSync(altPath)) {
          this.logger.log(`✓ Found templates in alternative path`);
          this.loadFromDirectory(altPath);
        } else {
          this.logger.error(`❌ Alternative path also does not exist`);
        }
        return;
      }

      this.loadFromDirectory(templatesDir);
    } catch (error) {
      this.logger.error(`Error loading templates: ${error.message}`, error.stack);
    }
  }

  private loadFromDirectory(directory: string) {
    this.logger.log(`Loading templates from: ${directory}`);
    
    const files = fs.readdirSync(directory);
    this.logger.log(`Found ${files.length} files: ${files.join(', ')}`);

    files.forEach((file) => {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templatePath = path.join(directory, file);

        this.logger.log(`Loading template: ${templateName}`);
        this.logger.log(`  File path: ${templatePath}`);

        try {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.logger.log(`  Content length: ${templateContent.length} characters`);
          
          const compiled = Handlebars.compile(templateContent);
          this.templates.set(templateName, compiled);
          
          this.logger.log(`  ✓ Template compiled and stored: ${templateName}`);
        } catch (error) {
          this.logger.error(`  ❌ Error loading template ${templateName}: ${error.message}`);
        }
      }
    });

    this.logger.log(`===========================================`);
    this.logger.log(`Total templates loaded: ${this.templates.size}`);
    this.logger.log(`Available templates: ${Array.from(this.templates.keys()).join(', ')}`);
    this.logger.log(`===========================================`);
  }

  async render(templateName: string, data: any): Promise<string> {
    this.logger.log(`Rendering template: ${templateName}`);
    this.logger.log(`Available templates: ${Array.from(this.templates.keys()).join(', ')}`);
    
    const template = this.templates.get(templateName);

    if (!template) {
      const error = `Template not found: ${templateName}. Available: ${Array.from(this.templates.keys()).join(', ')}`;
      this.logger.error(error);
      throw new Error(error);
    }

    try {
      const rendered = template(data);
      this.logger.log(`✓ Template rendered successfully: ${templateName}`);
      return rendered;
    } catch (error) {
      this.logger.error(`Error rendering template ${templateName}: ${error.message}`);
      throw error;
    }
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}