/**
 * API Configuration for Frontend
 * Uses environment variables injected by Vite
 */

// Get API base URL from environment or use default
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  RAW_API_BASE_URL === "SAME_ORIGIN"
    ? ""
    : RAW_API_BASE_URL || "http://localhost:3500";

export default API_BASE_URL;

/**
 * Helper function to build API URLs
 * @param endpoint - The API endpoint (e.g., "/api/auth/login")
 * @returns The full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Enhanced fetch wrapper that automatically uses the API base URL
 * @param endpoint - The API endpoint (e.g., "/api/auth/login")
 * @param options - Fetch options
 * @returns The fetch response
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
}
