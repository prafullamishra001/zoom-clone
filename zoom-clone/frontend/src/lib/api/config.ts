// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Derive WebSocket URL from API URL
const getWebSocketUrl = (apiUrl: string): string => {
  return apiUrl.replace(/^https?:\/\//, (match) => match === 'https://' ? 'wss://' : 'ws://').replace(/\/api$/, '/ws');
};

export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || getWebSocketUrl(API_BASE_URL);

// Default user ID (in production, this would come from authentication)
export const DEFAULT_USER_ID = 1;

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
  status?: number;
}
