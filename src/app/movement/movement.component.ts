import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar'; 
import { MatTooltipModule } from '@angular/material/tooltip'; 
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips'; 

import { EquipamentService } from '../services/equipament/equipment.service';
import { MovementService } from '../services/movement/movement.service';
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';

@Component({
  selector: 'app-movement',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatToolbarModule,   
    MatTooltipModule,   
    MatDialogModule,    
    MatChipsModule      
  ],
  templateUrl: './movement.component.html',
  styleUrls: ['./movement.component.css']
})
export class MovementComponent implements OnInit {

  equipamentId!: string;
  equipamento: any;
  historico: any[] = [];

  displayedColumns: string[] = ['dataHora', 'movementType', 'responsavel', 'projeto', 'local', 'observacao', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private movementService: MovementService,
    private router: Router,
    private dialog: MatDialog 
  ) { }

  ngOnInit(): void {
    this.equipamentId = this.route.snapshot.paramMap.get('id')!;
    if (this.equipamentId) {
      this.carregarDados();
    }
  }

  carregarDados() {
    this.equipamentService.findById(this.equipamentId).subscribe({
      next: (res) => {
        this.equipamento = res;
      },
      error: (err) => console.error('Erro ao carregar equipamento', err)
    });

    this.movementService.findHistoryByEquipament(this.equipamentId, 0, 10).subscribe({
      next: (res: any) => {
        this.historico = res.content || res;
      },
      error: (err) => console.error('Erro ao carregar histórico', err)
    });
  }

  verFotos(e: any): void {
    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      maxWidth: '90vw',
      data: {
        urls: e.imageUrls
      }
    });
  }

  novaMovimentacao() {
    this.router.navigate(['/equipaments', this.equipamentId, 'movimentacao', 'novo']);
  }

  visualizar(e: any): void {
    this.router.navigate(['/movimentacao/visualizar', e.id], {
      queryParams: { mode: 'view' }
    });
  }

  voltar() {
    this.router.navigate(['/equipaments']);
  }
}