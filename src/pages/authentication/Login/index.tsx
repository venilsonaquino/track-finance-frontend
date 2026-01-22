import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { Controller } from "react-hook-form"



const Login = ({ loading, control, login, showPassword, setShowPassword, onShowRegister }: { loading: boolean, control: any, login: any, showPassword: boolean, setShowPassword: React.Dispatch<React.SetStateAction<boolean>>, onShowRegister: () => void }) => {
    return (
        <div className="w-full lg:w-1/2 flex flex-col p-8 bg-background text-foreground">
            <div className="flex justify-end space-x-4 mb-8">
                <Button variant="outline" className="dark:bg-secondary bg-white">Entrar</Button>
                <Button variant="outline" onClick={onShowRegister}>Cadastrar</Button>
            </div>

            <div className="flex-1 flex items-center justify-center">
                <Card className="w-full max-w-md border-border bg-card text-card-foreground">
                    <CardHeader>
                        <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
                        <CardDescription>
                            Entre com suas credenciais para acessar sua conta
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={login} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field, fieldState: { error } }) => (
                                        <>
                                            <Input
                                                {...field}
                                                id="email"
                                                type="email"
                                                placeholder="seu@email.com"
                                                className={error ? "border-red-500" : ""}
                                            />
                                            {error && (
                                                <p className="text-sm text-red-500">{error.message}</p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field, fieldState: { error } }) => (
                                        <>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    className={error ? "border-red-500" : ""}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <Eye className="h-4 w-4" />
                                                    ) : (
                                                        <EyeOff className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {error && (
                                                <p className="text-sm text-red-500">{error.message}</p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Entrando..." : "Entrar"}
                            </Button>
                            <div className="text-center">
                                <Button variant="link" className="text-sm">
                                    Esqueceu sua senha?
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Login