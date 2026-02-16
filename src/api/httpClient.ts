import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthService } from './services/authService';
import { hasCookie, setCookie, getCookie } from 'cookies-next';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const authSessionKey = '_TRACK_FINANCE_TOKEN_';

// Função que será chamada quando um token for atualizado
type TokenUpdateCallback = (token: string) => void;
let tokenUpdateCallback: TokenUpdateCallback | null = null;

// Função para registrar o callback de atualização do token
export const registerTokenUpdateCallback = (callback: TokenUpdateCallback) => {
    tokenUpdateCallback = callback;
};

const HttpClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de requisição para adicionar o token a todas as requisições
HttpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (hasCookie(authSessionKey)) {
            const authData = JSON.parse(String(getCookie(authSessionKey)));
            if (authData?.token) {
                config.headers.Authorization = `Bearer ${authData.token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de resposta para tratar erros e tentar refresh token
HttpClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Se o erro for 401 (Unauthorized) e não estamos tentando fazer refresh token e não é uma requisição de login
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            originalRequest.url !== '/auth' &&
            originalRequest.url !== '/auth/refresh-token' &&
            hasCookie(authSessionKey)
        ) {
            originalRequest._retry = true;
            
            try {
                // Tentar fazer refresh token
                const response = await AuthService.refreshToken();
                
                if (response.data?.token) {
                    // Atualizar o token nos cookies
                    const authData = JSON.parse(String(getCookie(authSessionKey)));
                    authData.token = response.data.token;
                    setCookie(authSessionKey, JSON.stringify(authData));
                    
                    // Atualizar o header de autorização com o novo token
                    originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                    
                    // Notificar o AuthContext sobre a atualização do token, se estiver registrado
                    if (tokenUpdateCallback) {
                        tokenUpdateCallback(response.data.token);
                    }
                    
                    // Repetir a requisição original com o novo token
                    return HttpClient(originalRequest);
                }
            } catch (refreshError) {
                // Se falhar o refresh (400 ou qualquer outro erro), limpar os cookies e redirecionar para login
                if (hasCookie(authSessionKey)) {
                    setCookie(authSessionKey, '', { maxAge: 0 });
                }
                window.location.href = '/auth';
                return Promise.reject(refreshError);
            }
        }
        
        // Se for um erro 400 e estivermos tentando refresh token, também redirecionamos para login
        if (error.response?.status === 400 && originalRequest.url === '/auth/refresh-token') {
            if (hasCookie(authSessionKey)) {
                setCookie(authSessionKey, '', { maxAge: 0 });
            }
            window.location.href = '/auth';
            return Promise.reject(error);
        }
        
        return Promise.reject(error);
    }
);

export default HttpClient;
