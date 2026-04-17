import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// 1. Adicionamos o "expanded?: boolean" na interface
export interface MenuItem {
  label: string;
  route?: string;
  allowedRoles: string[];
  children?: MenuItem[];
  expanded?: boolean; // Diz se o submenu está aberto ou fechado
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
      label: 'Equipamentos',
      allowedRoles: ['ADMIN', 'COLABORADOR'],
      expanded: false, // Começa fechado
      children: [
        { label: 'Lista de Equipamentos', route: '/equipaments', allowedRoles: ['ADMIN', 'COLABORADOR'] },
        { label: 'Novo Equipamento', route: '/cadastro', allowedRoles: ['ADMIN'] }
      ]
    },
    {
      label: 'Usuários',
      allowedRoles: ['ADMIN'],
      expanded: false, // Começa fechado
      children: [
        { label: 'Lista de Usuários', route: '/users', allowedRoles: ['ADMIN'] },
        { label: 'Novo Usuário', route: '/users/novo', allowedRoles: ['ADMIN'] }
      ]
    }
  ];

  visibleMenus: MenuItem[] = [];

  ngOnInit(): void {
    this.visibleMenus = this.filterMenus(this.allMenus, this.userRole);
  }

  // 2. Criamos a função de clique
  toggleMenu(menu: MenuItem): void {
    // Se você quiser que ao abrir um, os outros fechem automaticamente, descomente a linha abaixo:
    // this.visibleMenus.forEach(m => { if (m !== menu) m.expanded = false; });
    
    // Inverte o estado (se for true vira false, se for false vira true)
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