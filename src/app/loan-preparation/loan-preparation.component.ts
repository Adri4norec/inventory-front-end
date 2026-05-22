import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, tap } from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatNativeDateModule } from '@angular/material/core';

import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanService } from '../services/loan/loan.service';
import { PerPartService } from '../services/per-part/per-part.service';
import { UserService } from '../services/user/user.service';

import { EquipmentLoanResponse } from '../models/loans/loans.model';
import { PerPartResponse } from '../models/per-part/per-part.model';
import { UserResponse } from '../models/users/UserResponse';
import { LoanRequest } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

@Component({
  selector: 'app-loan-preparation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatDatepickerModule, 
    MatNativeDateModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './loan-preparation.component.html',
  styleUrls: ['./loan-preparation.component.css']
})
export class LoanPreparationComponent implements OnInit {
  loanForm: FormGroup;
  accessoryControl = new FormControl<PerPartResponse | string | null>(null);
  accessoryQuantityControl = new FormControl<number>(1, [Validators.required, Validators.min(1)]);
  filteredPerParts: Observable<PerPartResponse[]> = of([]);
  availablePerParts: PerPartResponse[] = [];
  selectedAccessory: PerPartResponse | null = null;
  addedAccessories: Array<{
    perPartId: string;
    name: string;
    quantity: number;
    availableQuantity: number;
    originalTotalQuantity: number;
  }> = [];
  accessoryError: string | null = null;
  equipmentInfo: EquipmentLoanResponse | null = null;
  collaborators: UserResponse[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private equipmentService: EquipamentService,
    private loanService: LoanService,
    private perPartService: PerPartService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {
    this.loanForm = this.fb.group({
      tomboSearch: ['', [Validators.required]],
      equipmentId: ['', [Validators.required]],
      colaboradorId: ['', [Validators.required]],
      loanDate: [new Date().toISOString().substring(0, 16), [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.carregarColaboradores();
    this.setupAccessoryFiltering();
    this.loadAvailablePerParts();

    this.route.queryParams.subscribe(params => {
      const tombo = params['tombo'];
      if (tombo) {
        this.loanForm.patchValue({ tomboSearch: tombo });
        this.buscarEquipamento();
      }
    });
  }

  carregarColaboradores(): void {
    this.userService.listAll().subscribe({
      next: (response: any) => {
        const listaBruta = response.content ? response.content : response;
        this.collaborators = listaBruta.filter((u: UserResponse) => u.roleName === 'COLABORADOR');
      },
      error: (err: any) => {
        console.error('Erro na requisição:', err);
        this.exibirMensagemErro('Erro ao carregar lista de colaboradores');
      }
    });
  }

  private setupAccessoryFiltering(): void {
    this.filteredPerParts = this.accessoryControl.valueChanges.pipe(
      startWith(''),
      tap((value) => {
        if (!value || typeof value === 'string') {
          this.selectedAccessory = null;
        }
      }),
      map((value) => (typeof value === 'string' ? value : value?.name ?? '')),
      map((search) => this.filterPerParts(search))
    );
  }

  private loadAvailablePerParts(): void {
    this.perPartService.listAvailable().pipe(
      catchError(() => of<PerPartResponse[]>([]))
    ).subscribe((list) => {
      this.availablePerParts = (list ?? []).filter((item) => item.responsavel == null);
    });
  }

  getAccessoryOptionLabel(item: PerPartResponse): string {
    if (item.quantity === 0) {
      return `${item.name} — (Indisponível / Esgotado)`;
    }
    return `${item.name} — (${item.quantity} restantes)`;
  }

  private filterPerParts(search: string): PerPartResponse[] {
    const query = (search ?? '').toLowerCase().trim();
    if (!query) {
      return this.availablePerParts;
    }
    return this.availablePerParts.filter((item) =>
      item.name?.toLowerCase().includes(query)
    );
  }

  displayAccessoryFn(item: PerPartResponse | string | null): string {
    if (!item) return '';
    return typeof item === 'string' ? item : item.name || '';
  }

  onAccessorySelected(accessory: PerPartResponse): void {
    this.selectedAccessory = accessory;
    this.accessoryControl.setValue(accessory, { emitEvent: false });
    this.accessoryError = null;
  }

  addAccessoryToLoan(): void {
    this.accessoryError = null;

    if (!this.selectedAccessory) {
      this.accessoryError = 'Selecione um acessório antes de adicionar.';
      return;
    }

    const quantity = this.accessoryQuantityControl.value ?? 1;
    if (quantity < 1) {
      this.accessoryError = 'Quantidade inválida.';
      return;
    }

    if (quantity > this.selectedAccessory.quantity) {
      this.accessoryError = `Quantidade solicitada maior que o estoque disponível (${this.selectedAccessory.quantity}).`;
      return;
    }

    const accessoryId = this.selectedAccessory.id;
    const alreadyAdded = this.addedAccessories.find((item) => item.perPartId === accessoryId);
    if (alreadyAdded) {
      this.accessoryError = 'Este acessório já foi adicionado ao empréstimo.';
      return;
    }

    this.addedAccessories = [
      ...this.addedAccessories,
      {
        perPartId: accessoryId,
        name: this.selectedAccessory.name,
        quantity,
        availableQuantity: this.selectedAccessory.quantity,
        originalTotalQuantity: this.selectedAccessory.originalTotalQuantity ?? this.selectedAccessory.quantity
      }
    ];

    this.accessoryControl.setValue(null, { emitEvent: false });
    this.accessoryQuantityControl.setValue(1);
    this.selectedAccessory = null;
  }

  removeAccessory(index: number): void {
    this.addedAccessories.splice(index, 1);
  }

  buscarEquipamento(): void {
    const topo = this.loanForm.get('tomboSearch')?.value;
    if (!topo) return;

    this.loading = true;
    this.loanService.findByCodeToLoan(topo).subscribe({
      next: (data: EquipmentLoanResponse) => {
        this.equipmentInfo = data;
        this.loanForm.patchValue({ equipmentId: data.id });
        this.loading = false;
      },
      error: (err: any) => {
        this.equipmentInfo = null;
        this.loading = false;
        this.exibirMensagemErro(err.error?.message || 'Equipamento não encontrado');
      }
    });
  }

  salvar(): void {
    if (this.loanForm.invalid || !this.equipmentInfo) {
      this.loanForm.markAllAsTouched();
      return;
    }

    const loanDateRaw = this.loanForm.value.loanDate;
    const loanDateIso = loanDateRaw instanceof Date
      ? loanDateRaw.toISOString()
      : new Date(loanDateRaw).toISOString();

    const request: LoanRequest = {
      equipmentId: this.loanForm.value.equipmentId,
      colaboradorId: this.loanForm.value.colaboradorId,
      loanDate: loanDateIso,
      returnDate: null,
      helpdeskTicket: 'N/A',
      observation: 'Preparação iniciada via sistema',
      enviadoSedex: false,
      dataSedex: null,
      acessorios: this.addedAccessories.map((item) => ({
        perPartId: item.perPartId,
        quantity: item.quantity
      }))
    };

    this.loanService.prepareLoan(request).subscribe({
      next: () => {
        this.snackBar.open('Empréstimo iniciado!', 'OK', { duration: 3000 });
        this.router.navigate(['/loans']);
      },
      error: (err: any) => this.exibirMensagemErro(err.error?.message || 'Erro ao salvar')
    });
  }

  cancelar(): void {
    this.router.navigate(['/loans']); 
  }

  bloquearLetras(event: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (permitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }

  private exibirMensagemErro(msg: string): void {
    this.snackBar.open(msg, 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}