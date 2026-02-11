import { Navigate, Route, RouteProps, Routes } from 'react-router-dom'
import Layout from '@/layout/Layout'
import { useAuthContext } from '@/context/useAuthContext'
import DefaultLayout from '@/layout/DefaultLayout'
import { allAdminRoutes, allBlankRoutes } from '@/routes/index'


const AllRoutes = (props: RouteProps) => {
	const { isAuthenticated } = useAuthContext()
	return (
		<Routes>
			<Route>
				{allBlankRoutes.map((route, idx) => (
					<Route
						key={idx}
						path={route.path}
						element={<DefaultLayout {...props}>{route.element}</DefaultLayout>}
					/>
				))}
			</Route>

			<Route>
				{allAdminRoutes.map((route, idx) => (
					<Route
						path={route.path}
						element={
							isAuthenticated === false ? (
								<Navigate
									to={{
										pathname: '/auth',
										search: 'next=' + route.path,
									}}
								/>
							) : (
								<Layout {...props}>{route.element}</Layout>
							)
						}
						key={idx}
					/>
				))}
			</Route>
		</Routes>
	)
}

export default AllRoutes
