// Email service stub - implementação futura
export const emailService = {
  async sendKycStatusUpdate(userId: string, status: string, reason?: string) {
    console.log(`[EMAIL STUB] KYC status update for user ${userId}: ${status}`, reason);
    return Promise.resolve();
  },

  async sendWelcomeEmail(email: string, name: string) {
    console.log(`[EMAIL STUB] Welcome email to ${email} (${name})`);
    return Promise.resolve();
  },

  async sendPasswordReset(email: string, resetToken: string) {
    console.log(`[EMAIL STUB] Password reset to ${email} with token ${resetToken}`);
    return Promise.resolve();
  },

  async sendTicketUpdate(email: string, ticketId: string, status: string) {
    console.log(`[EMAIL STUB] Ticket update to ${email} for ticket ${ticketId}: ${status}`);
    return Promise.resolve();
  },

  async sendKycDocumentApproved(email: string, userName: string, documentType: string) {
    console.log(`[EMAIL STUB] KYC document approved for ${email} (${userName}): ${documentType}`);
    return Promise.resolve();
  },

  async sendKycDocumentRejected(email: string, userName: string, documentType: string, reason: string) {
    console.log(`[EMAIL STUB] KYC document rejected for ${email} (${userName}): ${documentType} - ${reason}`);
    return Promise.resolve();
  },

  async sendKycDocumentResubmit(email: string, userName: string, documentType: string, reason: string) {
    console.log(`[EMAIL STUB] KYC document resubmit for ${email} (${userName}): ${documentType} - ${reason}`);
    return Promise.resolve();
  },

  async sendKycCompleteApproval(email: string, userName: string) {
    console.log(`[EMAIL STUB] KYC complete approval for ${email} (${userName})`);
    return Promise.resolve();
  }
};
