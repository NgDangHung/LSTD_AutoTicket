// Application constants

export const QUEUE_STATUS = {
  WAITING: 'waiting',
  CALLING: 'calling',
  SERVING: 'serving',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  NO_SHOW: 'no_show',
} as const;

export const COUNTER_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  OFFLINE: 'offline',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  OFFICER: 'officer',
  VIEWER: 'viewer',
} as const;

export const SERVICE_TYPES = {
  CITIZEN_ID: 'citizen_id',
  BUSINESS_LICENSE: 'business_license',
  TAX: 'tax',
  SOCIAL_INSURANCE: 'social_insurance',
  CONSTRUCTION_PERMIT: 'construction_permit',
  OTHER: 'other',
} as const;

export const QUEUE_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
} as const;

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const POLLING_INTERVALS = {
  QUEUE_STATUS: 2000, // 2 seconds
  DASHBOARD_STATS: 30000, // 30 seconds
  COUNTER_STATUS: 5000, // 5 seconds
} as const;

export const AUDIO_FILES = {
  NOTIFICATION: '/sounds/notification.mp3',
  CALL_NUMBER: '/sounds/call-number.mp3',
  SUCCESS: '/sounds/success.mp3',
  ERROR: '/sounds/error.mp3',
} as const;

export const DEFAULT_SETTINGS = {
  AUTO_CALL_DELAY: 3000, // 3 seconds
  MAX_WAITING_TIME: 120, // 2 hours in minutes
  TICKET_PRINT_COPIES: 1,
  DISPLAY_REFRESH_RATE: 2000, // 2 seconds
  VOICE_ANNOUNCEMENT: true,
  SOUND_EFFECTS: true,
  TTS_LANGUAGE: 'vi-VN',
  TTS_RATE: 0.8,
  TTS_VOLUME: 1.0,
} as const;

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_QUEUE_NUMBERS_PER_DAY: 9999,
  MAX_SERVICE_NAME_LENGTH: 100,
  MAX_COUNTER_NAME_LENGTH: 50,
  MAX_REASON_LENGTH: 200,
} as const;

export const API_ENDPOINTS = {
  QUEUE: '/queue',
  COUNTERS: '/counters',
  SERVICES: '/services',
  USERS: '/users',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  COUNTER_ID: 'counter_id',
  LAST_QUEUE_NUMBER: 'last_queue_number',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng thử lại.',
  UNAUTHORIZED: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng liên hệ quản trị viên.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
} as const;

export const SUCCESS_MESSAGES = {
  QUEUE_CREATED: 'Tạo số thứ tự thành công',
  QUEUE_CALLED: 'Gọi số thành công',
  QUEUE_COMPLETED: 'Hoàn thành phục vụ',
  COUNTER_UPDATED: 'Cập nhật trạng thái quầy thành công',
  USER_CREATED: 'Tạo tài khoản thành công',
  SETTINGS_SAVED: 'Lưu cài đặt thành công',
} as const;
