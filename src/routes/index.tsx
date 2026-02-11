import Authentication from '@/pages/authentication'
import { lazy } from 'react'
import { Navigate, RouteProps } from 'react-router-dom'

const Error404 = lazy(() => import('@/pages/erros/Error404'))
const Error500 = lazy(() => import('@/pages/erros/Error500'))
const Dashboard = lazy(() => import('@/pages/dashboard'))

const WorkTimeExpense = lazy(() => import('@/pages/work-time-expense'))
const Wallet = lazy(() => import('@/pages/wallet'))
const Movement = lazy(() => import('@/pages/transactions/movements'))
const Budget = lazy(() => import('@/pages/transactions/budgets'))
const Categories = lazy(() => import('@/pages/category'))
const ImportTransactionPage = lazy(() => import('@/pages/transactions/import'))

type RoutesProps = {
    path: RouteProps['path']
    name: string
    element: RouteProps['element']
}

const dashboardRoutes: RoutesProps[] = [
    {
      path: '/',
      name: 'Home',
      element: <Navigate to='/dashboard' />,
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        element: <Dashboard />,
    }
]

const authRoutes: RoutesProps[] = [
	{
		path: '/auth',
		name: 'Login',
		element: <Authentication />,
	},
	{
		path: '/auth/auth-404',
		name: '404 Error',
		element: <Error404 />,
	},
	{
		path: '/auth/auth-500',
		name: '500 Error',
		element: <Error500 />,
	},
	{
		path: '*',
		name: '404 Error',
		element: <Error404 />,
	},
]

const workTimeExpensesRoutes: RoutesProps[] = [
	{
		path: '/horas-e-despesas',
		name: 'Horas e Despesas',
		element: <WorkTimeExpense />,
	},
]

const transactionsRoutes: RoutesProps[] = [
	{
		path: '/transacoes/movimentacoes',
		name: 'Movimentações',
		element: <Movement />,
	},
	{
		path: '/transacoes/importar',
		name: 'Importar Transações',
		element: <ImportTransactionPage />,
	},
	{
		path: '/transacoes/orcamento',
		name: 'Orçamentos',
		element: <Budget />,
	},
]

const walletsRoutes: RoutesProps[] = [
	{
		path: '/carteiras',
		name: 'Carteiras',
		element: <Wallet />,
	},
]

const categoriesRoutes: RoutesProps[] = [
	{
		path: '/categorias',
		name: 'Categorias',
		element: <Categories />,
	},
]

const allAdminRoutes = [
	...dashboardRoutes,
	...workTimeExpensesRoutes,
	...transactionsRoutes,
	...walletsRoutes,
	...categoriesRoutes,
]
const allBlankRoutes = [...authRoutes]

export { allAdminRoutes, allBlankRoutes }
