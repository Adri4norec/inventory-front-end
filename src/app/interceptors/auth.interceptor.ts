import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    // Compatibilidade: algumas telas gravam como `access_token`, outras como `token`.
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