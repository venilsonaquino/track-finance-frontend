import HttpClient from '@/api/httpClient';
import { RegisterRequest } from '@/api/dtos/auth/register/registerRequest';
import { LoginRequest } from '@/api/dtos/auth/login/loginRequest';

export const AuthService = {
  register: (data: RegisterRequest) => HttpClient.post('/auth/register', data),
  login: (data: LoginRequest) => HttpClient.post('/auth', data),
  refreshToken: () => HttpClient.post('/auth/refresh-token'),
  profile: () => HttpClient.get('/auth/profile'),
};