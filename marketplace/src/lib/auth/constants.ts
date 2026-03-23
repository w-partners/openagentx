export const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export interface UserPayload {
  id: string;
  email: string | null;
  nickname: string;
  role: string;
  walletAddress: string | null;
}
