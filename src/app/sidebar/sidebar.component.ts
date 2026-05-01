import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
export class SidebarComponent implements OnInit {
  userRole: string = 'ADMIN';

  allMenus: MenuItem[] = [
    {
      label: 'Inventário',
      allowedRoles: ['ADMIN', 'COLABORADOR'],
      expanded: false,
      children: [
        { label: 'Lista de Equipamentos', route: '/equipaments', allowedRoles: ['ADMIN', 'COLABORADOR'] },
        { label: 'Novo Equipamento', route: '/cadastro', allowedRoles: ['ADMIN'] }
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
    }
  ];

  visibleMenus: MenuItem[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole() || 'ADMIN';
    this.visibleMenus = this.filterMenus(this.allMenus, this.userRole);

    this.authService.userRole$.subscribe(role => {
      if (role) {
        this.userRole = role;
        this.visibleMenus = this.filterMenus(this.allMenus, this.userRole);
      }
    });
  }

  toggleMenu(menu: MenuItem): void {
    menu.expanded = !menu.expanded;
  }

  private filterMenus(menus: MenuItem[], role: string): MenuItem[] {
    return menus
      .filter(menu => menu.allowedRoles.includes(role))
      .map(menu => {
        if (menu.children) {
          return { ...menu, children: this.filterMenus(menu.children, role) };
        }
        return menu;
      });
  }
}