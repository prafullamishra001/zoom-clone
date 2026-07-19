import { apiClient } from './client';

// User types
export interface User {
  id: number;
  name: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  display_name: string;
}

// User API functions
export const usersApi = {
  async createUser(data: CreateUserRequest): Promise<User> {
    return apiClient.post<User>('/users/', data);
  },

  async getUserById(userId: number): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  },

  async getUserByEmail(email: string): Promise<User> {
    return apiClient.get<User>(`/users/email/${email}`);
  },
};
