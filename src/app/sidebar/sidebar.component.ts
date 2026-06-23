import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';
import { AppModuleKey } from '../settings/user-settings/access-profile.model';

export interface MenuItem {
  label: string;
  route?: string;
  module?: AppModuleKey;
  requiresEdit?: boolean;
  adminOnly?: boolean;
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
  private readonly allMenus: MenuItem[] = [
    {
      label: 'Inventário',
      module: 'inventory',
      expanded: true,
      children: [
        { label: 'Lista de Equipamentos', route: '/equipaments', module: 'inventory' },
        { label: 'Novo Equipamento', route: '/cadastro', module: 'inventory', requiresEdit: true },
        { label: 'Lista de acessórios', route: '/inventario/acessorios', module: 'inventory' },
        { label: 'Novo acessório', route: '/inventario/acessorios/novo', module: 'inventory', requiresEdit: true }
      ]
    },
    {
      label: 'Usuários',
      adminOnly: true,
      expanded: false,
      children: [
        { label: 'Lista de Usuários', route: '/users', adminOnly: true },
        { label: 'Novo Usuário', route: '/users/novo', adminOnly: true }
      ]
    },
    {
      label: 'Empréstimos',
      module: 'loans',
      expanded: false,
      children: [
        { label: 'Lista de Empréstimos', route: '/loans', module: 'loans' }
      ]
    },
    {
      label: 'Área do gerente',
      module: 'custody',
      expanded: false,
      children: [
        { label: 'Custódia', route: '/area-gerente', module: 'custody' }
      ]
    },
    {
      label: 'Configurações',
      adminOnly: true,
      expanded: false,
      children: [
        { label: 'Configuração de inventário', route: '/configuracoes/inventario', adminOnly: true },
        { label: 'Configuração de usuário', route: '/configuracoes/usuario', adminOnly: true },
        { label: 'Configuração de empréstimo', route: '/configuracoes/emprestimo', adminOnly: true },
        { label: 'Configuração de custódia', route: '/configuracoes/custodia', adminOnly: true }
      ]
    }
  ];

  visibleMenus: MenuItem[] = [];
  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.authService.resolveUserRole();
    this.permissionService.ensureLoaded().subscribe(() => this.refreshMenus());

    this.subs.add(
      this.permissionService.permissions$.subscribe(() => this.refreshMenus())
    );
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
    if (!this.authService.getToken()) {
      this.visibleMenus = [];
      return;
    }

    this.visibleMenus = this.allMenus
      .map((menu) => this.filterMenu(menu))
      .filter((menu): menu is MenuItem => !!menu);
  }

  private filterMenu(menu: MenuItem): MenuItem | null {
    if (menu.adminOnly && !this.authService.isAdmin()) {
      return null;
    }

    if (menu.children?.length) {
      const children = menu.children
        .map((child) => this.filterMenu(child))
        .filter((child): child is MenuItem => !!child);

      if (!children.length) {
        return null;
      }

      return {
        ...menu,
        children,
        expanded: menu.expanded
      };
    }

    if (menu.adminOnly) {
      return { ...menu };
    }

    if (!menu.module) {
      return null;
    }

    if (this.permissionService.isHidden(menu.module)) {
      return null;
    }

    if (menu.requiresEdit && !this.permissionService.canEdit(menu.module)) {
      return null;
    }

    if (!this.permissionService.canView(menu.module)) {
      return null;
    }

    return { ...menu };
  }
}
