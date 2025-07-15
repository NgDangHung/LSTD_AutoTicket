// Utility functions

export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
};

export const formatQueueNumber = (number: number, prefix: string = ''): string => {
  return `${prefix}${number.toString().padStart(3, '0')}`;
};

export const generateQueueNumber = (serviceType: string, sequence: number): string => {
  const prefixes: Record<string, string> = {
    citizen_id: 'A',
    business_license: 'B',
    tax: 'T',
    social_insurance: 'SI',
    construction_permit: 'CP',
    other: 'O',
  };
  
  const prefix = prefixes[serviceType] || 'G';
  return formatQueueNumber(sequence, prefix);
};

export const calculateWaitingTime = (
  currentPosition: number, 
  averageServiceTime: number
): number => {
  return currentPosition * averageServiceTime;
};

export const formatWaitingTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours} giờ ${remainingMinutes} phút`;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    waiting: 'text-yellow-600 bg-yellow-100',
    calling: 'text-blue-600 bg-blue-100',
    serving: 'text-green-600 bg-green-100',
    completed: 'text-gray-600 bg-gray-100',
    skipped: 'text-orange-600 bg-orange-100',
    no_show: 'text-red-600 bg-red-100',
    active: 'text-green-600 bg-green-100',
    paused: 'text-yellow-600 bg-yellow-100',
    offline: 'text-red-600 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
};

export const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    waiting: 'Đang chờ',
    calling: 'Đang gọi',
    serving: 'Đang phục vụ',
    completed: 'Hoàn thành',
    skipped: 'Bỏ qua',
    no_show: 'Không có mặt',
    active: 'Hoạt động',
    paused: 'Tạm ngưng',
    offline: 'Offline',
  };
  return texts[status] || status;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, delay);
    }
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone);
};

export const generateRandomId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

export const isWorkingHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Monday to Friday, 8 AM to 5 PM
  return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
