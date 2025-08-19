// Maintenance mode utilities

export interface MaintenanceSettings {
  isEnabled: boolean;
  message: string;
  estimatedCompletion?: string;
  supportEmail: string;
  allowedRoles: string[];
}

// In-memory storage for demo (in production, use database/cache)
let maintenanceSettings: MaintenanceSettings = {
  isEnabled: false,
  message: 'Sistema em manutenção. Voltamos em breve.',
  estimatedCompletion: '',
  supportEmail: 'suporte@angelsystem.com',
  allowedRoles: ['ADMIN'],
};

export function getMaintenanceSettings(): MaintenanceSettings {
  return maintenanceSettings;
}

export function setMaintenanceMode(
  enabled: boolean,
  settings?: Partial<MaintenanceSettings>
): void {
  maintenanceSettings = {
    ...maintenanceSettings,
    isEnabled: enabled,
    ...settings,
  };
}

export function isMaintenanceModeEnabled(): boolean {
  return maintenanceSettings.isEnabled;
}

export function canBypassMaintenance(userRole?: string): boolean {
  if (!userRole) return false;
  return maintenanceSettings.allowedRoles.includes(userRole);
}

export function updateMaintenanceMessage(
  message: string,
  estimatedCompletion?: string
): void {
  maintenanceSettings.message = message;
  if (estimatedCompletion !== undefined) {
    maintenanceSettings.estimatedCompletion = estimatedCompletion;
  }
}
