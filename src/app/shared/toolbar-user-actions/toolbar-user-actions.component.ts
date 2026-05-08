import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-toolbar-user-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './toolbar-user-actions.component.html',
  styleUrl: './toolbar-user-actions.component.css',
})
export class ToolbarUserActionsComponent {
  constructor(public auth: AuthService, private router: Router) {}

  get fullName(): string {
    return this.auth.getFullName() || '';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

