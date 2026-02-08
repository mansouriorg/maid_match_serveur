import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // 1. Send Email (Mock implementation)
  async sendEmail(to: string, subject: string, content: string) {
    // In the future, install 'nodemailer' and put real logic here
    this.logger.log(`[EMAIL SENT] To: ${to} | Subject: ${subject} | Content: ${content}`);
    return { success: true };
  }

  // 2. Send SMS (Mock implementation)
  async sendSms(phoneNumber: string, message: string) {
    // In the future, install 'twilio' and put real logic here
    this.logger.log(`[SMS SENT] To: ${phoneNumber} | Message: ${message}`);
    return { success: true };
  }

  // 3. Notify Admin about new request
  async notifyAdminNewRequest(customerName: string, serviceType: string) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await this.sendEmail(
      adminEmail, 
      'New Maid Request Received', 
      `Customer ${customerName} has requested ${serviceType}. Check dashboard.`
    );
  }
}