import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { logger } from './logger.js';

export function createHttpClient(baseURL: string, options?: AxiosRequestConfig): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15000,
    ...options,
  });

  client.interceptors.response.use(
    (res) => res,
    (error) => {
      logger.error(
        { url: error.config?.url, status: error.response?.status },
        'HTTP request failed',
      );
      throw error;
    },
  );

  return client;
}
