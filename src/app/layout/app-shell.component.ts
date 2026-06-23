import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LayoutService } from '../services/layout/layout.service';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';

/**
 * Shell único da aplicação: menu lateral + área principal.
 * A barra superior permanece em largura total; o menu empurra o conteúdo abaixo dela.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css']
})
export class AppShellComponent implements OnInit {
  /** Quando false (login/register), só a área principal ocupa a largura total. */
  @Input() showSidebar = true;

  constructor(
    public layout: LayoutService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    if (this.showSidebar) {
      this.authService.resolveUserRole();
      this.permissionService.ensureLoaded().subscribe();
    }
  }
}
