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
import { LoanListComponent } from './loan-list/loan-list.component';
import { LoanPreparationComponent } from './loan-preparation/loan-preparation.component';
import { PreparationLoanComponent } from './preparation-loan/preparation-loan.component';
import { PerPartListComponent } from './per-part-list/per-part-list.component';
import { PerPartComponent } from './per-part/per-part.component';

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
    path: 'equipaments', 
    component: EquipamentComponent, 
    canActivate: [authGuard],
    data: { title: 'Equipamentos' }
  },
  { 
    path: 'cadastro', 
    component: CadastroComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Novo Equipamento' }
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
    canActivate: [authGuard, adminGuard],
    data: { title: 'Preparar Empréstimo' }
  },

  { 
    path: 'equipaments/:id/preparation-loan', 
    component: PreparationLoanComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Empréstimo' }
  },
  {
    path: 'loans/:loanId/preparation-loan',
    component: PreparationLoanComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Empréstimo' }
  },

  { 
    path: 'equipaments/:id/movimentacao', 
    component: MovementComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Movimentação' }
  },
  { 
    path: 'movimentacao/visualizar/:movementId', 
    component: MovementComponent, 
    canActivate: [authGuard, adminGuard],
    data: { title: 'Movimentação' }
  },
  {
    path: 'loans',
    component: LoanListComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Empréstimos' }
  },

  {
    path: 'inventario/acessorios/novo',
    component: PerPartComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Novo Acessório' }
  },
  {
    path: 'inventario/acessorios/editar/:id',
    component: PerPartComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Editar Acessório' }
  },
  {
    path: 'inventario/acessorios',
    component: PerPartListComponent,
    canActivate: [authGuard, adminGuard],
    data: { title: 'Acessórios' }
  },

  { path: '**', redirectTo: '' }
];