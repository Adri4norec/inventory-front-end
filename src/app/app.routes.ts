import { Routes } from '@angular/router';
import { EquipamentComponent } from './equipament/equipament.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { LoginComponent } from './pages/login/login.component';
import { UserComponent } from './user/user.component';
import { CadastroUserComponent } from './cadastro-user/cadastro-user.component';
import { MovementComponent } from './movement/movement.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  { 
    path: 'users', 
    component: UserComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'users/novo', 
    component: CadastroUserComponent, 
    canActivate: [authGuard] 
  },        
  { 
    path: 'users/editar/:id', 
    component: CadastroUserComponent, 
    canActivate: [authGuard] 
  },  
  { 
    path: 'users/visualizar/:id', 
    component: CadastroUserComponent, 
    canActivate: [authGuard] 
  }, 

  { 
    path: 'equipaments', 
    component: EquipamentComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'cadastro', 
    component: CadastroComponent, 
    canActivate: [authGuard] 
  }, 
  { 
    path: 'cadastro/:id', 
    component: CadastroComponent, 
    canActivate: [authGuard] 
  },

  { 
    path: 'equipaments/:id/movimentacao', 
    component: MovementComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'movimentacao/visualizar/:movementId', 
    component: MovementComponent, 
    canActivate: [authGuard] 
  },

  { path: '**', redirectTo: '' }
];