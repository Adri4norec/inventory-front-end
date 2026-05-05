import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LayoutService } from '../services/layout/layout.service';

/**
 * Shell único da aplicação: menu lateral + área principal.
 * O sidebar empurra o conteúdo (flex) em vez de sobrepor (fixed).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  /** Quando false (login/register), só a área principal ocupa a largura total. */
  @Input() showSidebar = true;

  constructor(public layout: LayoutService) {}
}
