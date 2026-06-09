import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url || '';
  const isLoginRoute = /\/api\/v1\/users\/login(\?|#|$)/.test(url) || /\/users\/login(\?|#|$)/.test(url);

  if (isLoginRoute) {
    const cleaned = req.clone({ headers: req.headers.delete('Authorization') });
    return next(cleaned);
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(cloned);
    } else {
    }
  } else {
  }

  return next(req);
};