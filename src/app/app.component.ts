import { Component, OnInit } from '@angular/core';
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
export class AppComponent implements OnInit {
  mostrarLayout = true;

  private readonly rotasSemMenu = ['/', '/login', '/register'];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.atualizarLayout(this.router.url);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => this.atualizarLayout(event.urlAfterRedirects));
  }

  private atualizarLayout(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.mostrarLayout = !this.rotasSemMenu.includes(path);
  }
}