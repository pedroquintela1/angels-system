// Notification service stub - implementação futura
export const notificationService = {
  async createNotification(userId: string, title: string, message: string, type: string = 'info') {
    console.log(`[NOTIFICATION STUB] To user ${userId}: ${title} - ${message} (${type})`);
    return Promise.resolve();
  },

  async sendPushNotification(userId: string, title: string, message: string) {
    console.log(`[PUSH STUB] To user ${userId}: ${title} - ${message}`);
    return Promise.resolve();
  },

  async createSystemNotification(title: string, message: string, userIds: string[]) {
    console.log(`[SYSTEM NOTIFICATION STUB] To users ${userIds.join(', ')}: ${title} - ${message}`);
    return Promise.resolve();
  },

  async markAsRead(notificationId: string) {
    console.log(`[NOTIFICATION STUB] Marked as read: ${notificationId}`);
    return Promise.resolve();
  },

  async getUnreadCount(userId: string) {
    console.log(`[NOTIFICATION STUB] Unread count for user ${userId}`);
    return Promise.resolve(0);
  },

  async createKycNotification(userId: string, status: string, documentType?: string, reason?: string) {
    const title = `KYC ${status}`;
    let message = `Seu documento KYC foi ${status.toLowerCase()}`;
    if (documentType) message += ` (${documentType})`;
    if (reason) message += ` - ${reason}`;
    
    console.log(`[KYC NOTIFICATION STUB] To user ${userId}: ${title} - ${message}`);
    return Promise.resolve();
  },

  async getUserNotifications(filters: any) {
    console.log(`[NOTIFICATION STUB] Get notifications with filters:`, filters);
    return Promise.resolve([]);
  },

  async markAllAsRead(userId: string) {
    console.log(`[NOTIFICATION STUB] Mark all as read for user ${userId}`);
    return Promise.resolve({ markedCount: 0 });
  },

  async deleteNotification(notificationId: string, userId: string) {
    console.log(`[NOTIFICATION STUB] Delete notification ${notificationId} for user ${userId}`);
    return Promise.resolve();
  }
};
