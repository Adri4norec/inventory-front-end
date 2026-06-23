import { Routes } from '@angular/router';
import { EquipamentComponent } from './equipament/equipament.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { LoginComponent } from './pages/login/login.component';
import { UserComponent } from './user/user.component';
import { CadastroUserComponent } from './cadastro-user/cadastro-user.component';
import { MovementComponent } from './movement/movement.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { equipmentFormGuard } from './guards/equipment-form.guard';
import { modulePermissionGuard } from './guards/module-permission.guard';
import { LoanListComponent } from './loan-list/loan-list.component';
import { LoanPreparationComponent } from './loan-preparation/loan-preparation.component';
import { PreparationLoanComponent } from './preparation-loan/preparation-loan.component';
import { PerPartListComponent } from './per-part-list/per-part-list.component';
import { PerPartComponent } from './per-part/per-part.component';
import { ManagerAreaComponent } from './manager-area/manager-area.component';
import { AssetDetailsComponent } from './asset-details/asset-details.component';
import { InventorySettingsComponent } from './settings/inventory-settings/inventory-settings.component';
import { UserSettingsComponent } from './settings/user-settings/user-settings.component';
import { LoanSettingsComponent } from './settings/loan-settings/loan-settings.component';
import { CustodySettingsComponent } from './settings/custody-settings/custody-settings.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  { 
    path: 'users', 
    component: UserComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Usuários' }
  },
  { 
    path: 'users/novo', 
    component: CadastroUserComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Novo Usuário' }
  },        
  { 
    path: 'users/editar/:id', 
    component: CadastroUserComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Editar Usuário' }
  },  
  { 
    path: 'users/visualizar/:id', 
    component: CadastroUserComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Visualizar Usuário' }
  }, 

  { 
    path: 'inventario', 
    component: HomeComponent, 
    canActivate: [authGuard],
    data: { title: 'Inventário' }
  },
  { 
    path: 'equipaments', 
    component: EquipamentComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Equipamentos', module: 'inventory', minLevel: 'visualizar' }
  },
  { 
    path: 'cadastro', 
    component: CadastroComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Novo Equipamento', module: 'inventory', minLevel: 'editar' }
  }, 
  { 
    path: 'cadastro/:id', 
    component: CadastroComponent, 
    canActivate: [authGuard, equipmentFormGuard],
    data: { title: 'Editar Equipamento' }
  },

  { 
    path: 'equipaments/loan-preparation', 
    component: LoanPreparationComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Preparar Empréstimo', module: 'loans', minLevel: 'editar' }
  },

  { 
    path: 'equipaments/:id/preparation-loan', 
    component: PreparationLoanComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Empréstimo', module: 'loans', minLevel: 'editar' }
  },
  {
    path: 'loans/:loanId/preparation-loan',
    component: PreparationLoanComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Empréstimo', module: 'loans', minLevel: 'editar' }
  },

  { 
    path: 'equipaments/:id/movimentacao', 
    component: MovementComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Movimentação', module: 'inventory', minLevel: 'editar' }
  },
  {
    path: 'equipaments/:id/detalhes',
    component: AssetDetailsComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Detalhes do Ativo', modules: ['inventory', 'custody'], minLevel: 'visualizar' }
  },
  { 
    path: 'movimentacao/visualizar/:movementId', 
    component: MovementComponent, 
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Movimentação', module: 'inventory', minLevel: 'visualizar' }
  },
  {
    path: 'loans',
    component: LoanListComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Empréstimos', module: 'loans', minLevel: 'visualizar' }
  },

  {
    path: 'inventario/acessorios/novo',
    component: PerPartComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Novo Acessório', module: 'inventory', minLevel: 'editar' }
  },
  {
    path: 'inventario/acessorios/editar/:id',
    component: PerPartComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Editar Acessório', module: 'inventory', minLevel: 'editar' }
  },
  {
    path: 'inventario/acessorios',
    component: PerPartListComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Acessórios', module: 'inventory', minLevel: 'visualizar' }
  },

  {
    path: 'area-gerente',
    component: ManagerAreaComponent,
    canActivate: [authGuard, modulePermissionGuard],
    data: { title: 'Área do gerente', module: 'custody', minLevel: 'visualizar' }
  },

  {
    path: 'configuracoes/inventario',
    component: InventorySettingsComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Configuração de inventário' }
  },
  {
    path: 'configuracoes/usuario',
    component: UserSettingsComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Configuração de usuário' }
  },
  {
    path: 'configuracoes/emprestimo',
    component: LoanSettingsComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Configuração de empréstimo' }
  },
  {
    path: 'configuracoes/custodia',
    component: CustodySettingsComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Configuração de custódia' }
  },

  { path: '**', redirectTo: '' }
];