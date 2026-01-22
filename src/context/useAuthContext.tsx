import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { deleteCookie, hasCookie, setCookie, getCookie } from 'cookies-next'
import { LoginResponse } from '@/api/dtos/auth/loginResponse'
import { AuthService } from '@/api/services/authService'


export type AuthContextType = {
	authenticatedUser: LoginResponse | undefined
	isAuthenticated: boolean
	saveSession: (session: LoginResponse) => void
	removeSession: () => void
	updateToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuthContext must be used within an AuthProvider')
	}
	return context
}

const authSessionKey = '_TRACK_FINANCE_TOKEN_'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [authenticatedUser, setAuthenticatedUser] = useState<LoginResponse | undefined>(undefined)
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	// Carregar dados do usuário do cookie ao iniciar
	useEffect(() => {
		const loadUserData = async () => {
			const hasAuth = hasCookie(authSessionKey)
			if (hasAuth) {
				try {
					const authData = JSON.parse(String(getCookie(authSessionKey)))
					setAuthenticatedUser(authData)
					setIsAuthenticated(true)
					
					// Opcional: validar o perfil do usuário com o backend
					try {
						await AuthService.profile()
					} catch (error) {
						// Se o perfil falhar e não for possível fazer refresh, 
						// limpar a sessão para forçar novo login
						console.error('Falha ao validar perfil do usuário', error)
					}
				} catch (error) {
					console.error('Erro ao carregar dados do usuário', error)
					removeSession()
				}
			} else {
				setIsAuthenticated(false)
				setAuthenticatedUser(undefined)
			}
		}
		
		loadUserData()
	}, [])

	const saveSession = (authenticatedUser: LoginResponse) => {
		setCookie(authSessionKey, JSON.stringify(authenticatedUser))
		setAuthenticatedUser(authenticatedUser)
		setIsAuthenticated(true)
	}

	const removeSession = () => {
		deleteCookie(authSessionKey)
		setAuthenticatedUser(undefined)
		setIsAuthenticated(false)
	}
	
	// Função para atualizar apenas o token, mantendo os dados do usuário
	const updateToken = (token: string) => {
		if (authenticatedUser) {
			const updatedUser = {
				...authenticatedUser,
				token
			}
			setCookie(authSessionKey, JSON.stringify(updatedUser))
			setAuthenticatedUser(updatedUser)
		}
	}

	return (
		<AuthContext.Provider
			value={{
				authenticatedUser,
				isAuthenticated,
				saveSession,
				removeSession,
				updateToken
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}