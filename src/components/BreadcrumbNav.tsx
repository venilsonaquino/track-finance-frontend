import { ReactNode, Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label?: string;
  href?: string;
  icon?: ReactNode;
  children?: ReactNode;
  description?: string;
}

const PageBreadcrumbNav = ({ items, children }: { items?: BreadcrumbItem[] | null, children?: ReactNode }) => {
	const breadcrumbItems = items || [];
	const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
	return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">
                Início
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbItems.map((item, index) => (
            <Fragment key={index}>
              <BreadcrumbSeparator />
              {index === breadcrumbItems.length - 1 ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              ) : item.href ? (
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>
                      {item.icon && <span className="mr-1">{item.icon}</span>}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <span className="text-muted-foreground">
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </span>
                </BreadcrumbItem>
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {lastItem && (
        <>
          <h1 className="text-2xl font-bold mt-2">{lastItem.label}</h1>
          {lastItem.description && <p className="text-muted-foreground">{lastItem.description}</p>}
        </>
      )}
      {children}
    </div>
	)
}

export default PageBreadcrumbNav; 