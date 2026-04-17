import { Routes } from '@angular/router';
import { EquipamentComponent } from './equipament/equipament.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component'; 
import { UserComponent } from './user/user.component';
import { CadastroUserComponent } from './cadastro-user/cadastro-user.component';
import { MovementComponent } from './movement/movement.component';
import { CadastroMovementComponent } from './cadastro-movement/cadastro-movement.component';

export const routes: Routes = [
  // Rotas de Autenticação
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }, 

  // Rotas de Gestão de Usuários
  { path: 'users', component: UserComponent },
  { path: 'users/novo', component: CadastroUserComponent },        
  { path: 'users/editar/:id', component: CadastroUserComponent },  
  { path: 'users/visualizar/:id', component: CadastroUserComponent }, 

  // Rotas de Gestão de Equipamentos
  { path: 'equipaments', component: EquipamentComponent },
  { path: 'cadastro', component: CadastroComponent }, 
  { path: 'cadastro/:id', component: CadastroComponent },

  //Rota de Movimentação
  { path: 'equipaments/:id/movimentacao', component: MovementComponent },
  { path: 'equipaments/:id/movimentacao/novo', component: CadastroMovementComponent },
  { path: 'movimentacao/visualizar/:id', component: CadastroMovementComponent },

  // Rota Curinga
  { path: '**', redirectTo: '' }
];