import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { httpErrorInterceptor } from './app/interceptors/http-error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, httpErrorInterceptor])
    ),
    provideAnimationsAsync()
  ]
}).catch((err) => console.error(err));