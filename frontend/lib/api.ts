/**
 * API client with authentication support.
 * Handles all API requests with automatic token management.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Types
interface ApiResponse<T> {
  data: T;
  status: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiError {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: string[] | string | undefined;
}

class ApiClient {
  private token: string | null = null;

  /**
   * Set the authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Get the current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        // Token is invalid, clear it
        this.token = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          window.location.href = '/admin/login';
        }
        throw new Error('Session expired. Please login again.');
      }

      // Handle other errors
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.detail ||
          errorData.message ||
          errorData.non_field_errors?.[0] ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Make a request with FormData (for file uploads)
   */
  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (response.status === 401) {
        this.token = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          window.location.href = '/admin/login';
        }
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.detail ||
          errorData.message ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // =========================================================================
  // AUTH ENDPOINTS
  // =========================================================================

  async login(username: string, password: string) {
    const response = await this.request<{ token: string; user: any }>(
      '/auth/login/',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
    return response;
  }

  async logout() {
    return this.request('/auth/logout/', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/user/');
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request<{ message: string; token: string }>(
      '/auth/change-password/',
      {
        method: 'POST',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirm: newPassword,
        }),
      }
    );
  }

  async getUsers() {
    return this.request<any[]>('/auth/users/');
  }

  // =========================================================================
  // CAR ENDPOINTS (Admin)
  // =========================================================================

  async getCars(page = 1) {
    return this.request<PaginatedResponse<any>>(
      `/admin/cars/?page=${page}`
    );
  }

  async getCar(id: number) {
    return this.request<any>(`/admin/cars/${id}/`);
  }

  async createCar(data: FormData) {
    return this.requestFormData<any>('/admin/cars/', data, 'POST');
  }

  async updateCar(id: number, data: FormData) {
    return this.requestFormData<any>(`/admin/cars/${id}/`, data, 'PATCH');
  }

  async deleteCar(id: number) {
    return this.request(`/admin/cars/${id}/`, { method: 'DELETE' });
  }

  // =========================================================================
  // ARTICLE ENDPOINTS (Admin)
  // =========================================================================

  async getArticles(page = 1) {
    return this.request<PaginatedResponse<any>>(
      `/admin/articles/?page=${page}`
    );
  }

  async getArticle(id: number) {
    return this.request<any>(`/admin/articles/${id}/`);
  }

  async createArticle(data: FormData) {
    return this.requestFormData<any>('/admin/articles/', data, 'POST');
  }

  async updateArticle(id: number, data: FormData) {
    return this.requestFormData<any>(`/admin/articles/${id}/`, data, 'PATCH');
  }

  async deleteArticle(id: number) {
    return this.request(`/admin/articles/${id}/`, { method: 'DELETE' });
  }

  // =========================================================================
  // BRANCH ENDPOINTS (Admin)
  // =========================================================================

  async getBranches(page = 1) {
    return this.request<PaginatedResponse<any>>(
      `/admin/branches/?page=${page}`
    );
  }

  async getBranch(id: number) {
    return this.request<any>(`/admin/branches/${id}/`);
  }

  async createBranch(data: any) {
    return this.request<any>('/admin/branches/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBranch(id: number, data: any) {
    return this.request<any>(`/admin/branches/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBranch(id: number) {
    return this.request(`/admin/branches/${id}/`, { method: 'DELETE' });
  }

  // =========================================================================
  // INQUIRY ENDPOINTS (Admin - Read Only)
  // =========================================================================

  async getInquiries(page = 1) {
    return this.request<PaginatedResponse<any>>(
      `/admin/inquiries/?page=${page}`
    );
  }

  async getInquiry(id: number) {
    return this.request<any>(`/admin/inquiries/${id}/`);
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export types
export type { PaginatedResponse, ApiError };
