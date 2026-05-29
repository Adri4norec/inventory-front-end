import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';

export interface MenuItem {
  label: string;
  route?: string;
  allowedRoles: string[];
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly colaboradorMenus: MenuItem[] = [
    {
      label: 'Inventário',
      allowedRoles: ['COLABORADOR'],
      expanded: true,
      children: [
        { label: 'Lista de Equipamentos', route: '/equipaments', allowedRoles: ['COLABORADOR'] }
      ]
    }
  ];

  allMenus: MenuItem[] = [
    {
      label: 'Inventário',
      allowedRoles: ['ADMIN', 'COLABORADOR'],
      expanded: true,
      children: [
        { label: 'Lista de Equipamentos', route: '/equipaments', allowedRoles: ['ADMIN', 'COLABORADOR'] },
        { label: 'Novo Equipamento', route: '/cadastro', allowedRoles: ['ADMIN'] },
        { label: 'Listagem de acessórios', route: '/inventario/acessorios', allowedRoles: ['ADMIN'] },
        { label: 'Novo acessório', route: '/inventario/acessorios/novo', allowedRoles: ['ADMIN'] }
      ]
    },
    {
      label: 'Usuários',
      allowedRoles: ['ADMIN'],
      expanded: false,
      children: [
        { label: 'Lista de Usuários', route: '/users', allowedRoles: ['ADMIN'] },
        { label: 'Novo Usuário', route: '/users/novo', allowedRoles: ['ADMIN'] }
      ]
    },
    {
      label: 'Empréstimos',
      allowedRoles: ['ADMIN'],
      expanded: false,
      children: [
        { label: 'Lista de Empréstimos', route: '/loans', allowedRoles: ['ADMIN'] }
      ]
    },
    {
      label: 'Área do gerente',
      allowedRoles: ['ADMIN'],
      expanded: false,
      children: [
        { label: 'Custódia', route: '/area-gerente', allowedRoles: ['ADMIN'] }
      ]
    }
  ];

  visibleMenus: MenuItem[] = [];
  private subs = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.resolveUserRole();
    this.refreshMenus();

    this.subs.add(
      this.authService.userRole$.subscribe(() => this.refreshMenus())
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleMenu(menu: MenuItem): void {
    menu.expanded = !menu.expanded;
  }

  private refreshMenus(): void {
    if (this.authService.isColaborador()) {
      this.visibleMenus = this.cloneMenus(this.colaboradorMenus);
      return;
    }

    if (this.authService.isAdmin()) {
      this.visibleMenus = this.cloneMenus(this.allMenus);
      return;
    }

    this.visibleMenus = [];
  }

  private cloneMenus(menus: MenuItem[]): MenuItem[] {
    return menus.map((menu) => ({
      ...menu,
      children: menu.children ? menu.children.map((child) => ({ ...child })) : undefined
    }));
  }
}
