import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LayoutService } from '../../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../../shared/toolbar-logo/toolbar-logo.component';

@Component({
  selector: 'app-custody-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './custody-settings.component.html',
  styleUrls: ['./custody-settings.component.css']
})
export class CustodySettingsComponent {
  constructor(public layout: LayoutService) {}
}
