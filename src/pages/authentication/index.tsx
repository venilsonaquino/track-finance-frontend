import { useState } from "react"
import { Navigate } from "react-router-dom"
import Login from "./Login"
import useLogin from "./Login/useLogin"
import Register from "./Register"

const Authentication = () => {
    const [showRegister, setShowRegister] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const { loading, control, login, redirectUrl, isAuthenticated } = useLogin()
  
    return (
        <div className="min-h-screen flex bg-background text-foreground">
            {/* Lado esquerdo */}
            {isAuthenticated && <Navigate to={redirectUrl} replace />}
            <div className="hidden lg:flex w-1/2 bg-primary dark:bg-sidebar items-center justify-center">
                <div className="text-center text-primary-foreground dark:text-sidebar-foreground space-y-4">
                    <div className="w-32 h-32 bg-background dark:bg-sidebar-accent rounded-full mx-auto flex items-center justify-center">
                        <span className="text-primary dark:text-sidebar-primary text-4xl font-bold">TF</span>
                    </div>
                    <h1 className="text-4xl font-bold">Track Finance</h1>
                    <p className="text-lg">Gerencie suas finanças de forma simples e eficiente</p>
                </div>
            </div>

            {/* Lado direito */}
            {showRegister ? (
                <Register onShowLogin={() => setShowRegister(false)} />
            ) : (
                <Login
                    loading={loading}
                    control={control}
                    login={login}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    onShowRegister={() => setShowRegister(true)}
                />
            )}
        </div>
    )
}

export default Authentication