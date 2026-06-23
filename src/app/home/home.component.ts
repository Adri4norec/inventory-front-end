import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LayoutService } from '../services/layout/layout.service';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';
import { AppModuleKey } from '../settings/user-settings/access-profile.model';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';

interface HomeCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  module?: AppModuleKey;
  requiresEdit?: boolean;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly allCards: HomeCard[] = [
    {
      title: 'Lista de Equipamentos',
      description: 'Visualize todos os equipamentos cadastrados.',
      icon: 'laptop_mac',
      route: '/equipaments',
      module: 'inventory',
    },
    {
      title: 'Novo Equipamento',
      description: 'Cadastre um novo equipamento no sistema.',
      icon: 'add',
      route: '/cadastro',
      module: 'inventory',
      requiresEdit: true,
    },
    {
      title: 'Lista de Acessórios',
      description: 'Visualize todos os acessórios cadastrados.',
      icon: 'sell',
      route: '/inventario/acessorios',
      module: 'inventory',
    },
    {
      title: 'Novo Acessório',
      description: 'Cadastre um novo acessório no sistema.',
      icon: 'add_circle_outline',
      route: '/inventario/acessorios/novo',
      module: 'inventory',
      requiresEdit: true,
    },
    {
      title: 'Lista de Usuários',
      description: 'Consulte e gerencie os usuários do sistema.',
      icon: 'group',
      route: '/users',
      adminOnly: true,
    },
    {
      title: 'Novo Usuário',
      description: 'Cadastre um novo usuário no sistema.',
      icon: 'person_add',
      route: '/users/novo',
      adminOnly: true,
    },
    {
      title: 'Lista de Empréstimos',
      description: 'Acompanhe empréstimos e devoluções.',
      icon: 'assignment',
      route: '/loans',
      module: 'loans',
    },
    {
      title: 'Itens sob Custódia',
      description: 'Visualize itens sob custódia na área do gerente.',
      icon: 'published_with_changes',
      route: '/area-gerente',
      module: 'custody',
    },
    {
      title: 'Configuração de Inventário',
      description: 'Ajuste parâmetros do módulo de inventário.',
      icon: 'inventory_2',
      route: '/configuracoes/inventario',
      adminOnly: true,
    },
    {
      title: 'Configuração de Usuário',
      description: 'Gerencie perfis e regras de acesso.',
      icon: 'manage_accounts',
      route: '/configuracoes/usuario',
      adminOnly: true,
    },
    {
      title: 'Configuração de Empréstimo',
      description: 'Defina opções do fluxo de empréstimos.',
      icon: 'settings',
      route: '/configuracoes/emprestimo',
      adminOnly: true,
    },
    {
      title: 'Configuração de Custódia',
      description: 'Configure regras de custódia de equipamentos.',
      icon: 'admin_panel_settings',
      route: '/configuracoes/custodia',
      adminOnly: true,
    },
  ];

  visibleCards: HomeCard[] = [];
  private subs = new Subscription();

  constructor(
    public layout: LayoutService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authService.resolveUserRole();
    this.permissionService.ensureLoaded().subscribe(() => this.refreshCards());

    this.subs.add(
      this.permissionService.permissions$.subscribe(() => this.refreshCards())
    );
    this.subs.add(
      this.authService.userRole$.subscribe(() => this.refreshCards())
    );

    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        if (params.get('accessDenied') === '1') {
          this.snackBar.open('Acesso negado. Você não tem permissão para esta página.', 'Fechar', {
            duration: 5000,
          });
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { accessDenied: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  navigateTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  private refreshCards(): void {
    if (!this.authService.getToken()) {
      this.visibleCards = [];
      return;
    }

    this.visibleCards = this.allCards.filter((card) => this.isCardVisible(card));
  }

  private isCardVisible(card: HomeCard): boolean {
    if (card.adminOnly) {
      return this.authService.isAdmin();
    }

    if (!card.module) {
      return false;
    }

    if (this.permissionService.isHidden(card.module)) {
      return false;
    }

    if (card.requiresEdit) {
      return this.permissionService.canEdit(card.module);
    }

    return this.permissionService.canView(card.module);
  }
}
