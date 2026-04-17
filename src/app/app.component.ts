import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EquipamentComponent } from './equipament/equipament.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, EquipamentComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'inventory';
}