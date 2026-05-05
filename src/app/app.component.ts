import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from './layout/app-shell.component';
import { filter } from 'rxjs/operators';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppShellComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  mostrarLayout: boolean = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const rotasSemMenu = ['/', '/login', '/register'];
      this.mostrarLayout = !rotasSemMenu.includes(event.urlAfterRedirects);
    });
  }
}