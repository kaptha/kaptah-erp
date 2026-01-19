import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendDocumentDto } from './dto/send-document.dto';
import { ScheduleReminderDto } from './dto/schedule-reminder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-document')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendDocument(@Body() sendDocumentDto: SendDocumentDto) {
    return this.emailService.sendDocument(sendDocumentDto);
  }

  @Post('schedule-reminder')
  @HttpCode(HttpStatus.CREATED)
  async scheduleReminder(@Body() scheduleReminderDto: ScheduleReminderDto) {
    return this.emailService.scheduleReminder(scheduleReminderDto);
  }

  @Get('status/:logId')
  async getStatus(@Param('logId') logId: string) {
    return this.emailService.getEmailStatus(logId);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('organizationId') organizationId: string,
    @Query('emailType') emailType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.emailService.getEmailHistory(userId, organizationId, {
      emailType,
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Delete('scheduled/:scheduledId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelScheduled(@Param('scheduledId') scheduledId: string) {
    await this.emailService.cancelScheduledEmail(scheduledId);
  }
}