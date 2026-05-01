import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { filter } from 'rxjs/operators';
import { LayoutService } from './services/layout/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'inventory';
  mostrarLayout: boolean = true;

  constructor(private router: Router, public layout: LayoutService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const rotasSemMenu = ['/', '/login', '/register'];
      this.mostrarLayout = !rotasSemMenu.includes(event.urlAfterRedirects);
    });
  }
}