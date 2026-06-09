import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Self,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';

export const AUTOCOMPLETE_CREATE_NEW = '__AUTOCOMPLETE_CREATE_NEW__' as const;

@Component({
  selector: 'app-autocomplete-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
  ],
  templateUrl: './autocomplete-create.component.html',
  styleUrl: './autocomplete-create.component.scss',
})
export class AutocompleteCreateComponent<T = Record<string, unknown>>
  implements ControlValueAccessor, OnInit, OnChanges, OnDestroy
{
  @Input() label = '';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() options: T[] = [];
  @Input({ required: true }) bindLabel!: string;
  @Input({ required: true }) bindValue!: string;
  @Input() requiredError = '';
  @Input() showCreateButton = true;

  @Output() search = new EventEmitter<string>();
  @Output() createNew = new EventEmitter<string>();

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;

  readonly displayControl = new FormControl<string | T>('', { nonNullable: false });
  readonly createNewSentinel = AUTOCOMPLETE_CREATE_NEW;

  private storedValue: unknown = null;
  private lastTypedTerm = '';
  private onChange: (value: unknown) => void = () => {};
  private onTouchedCallback: () => void = () => {};
  private readonly destroy$ = new Subject<void>();
  private valueChangesSub?: Subscription;
  private parentStatusSub?: Subscription;

  readonly parentErrorMatcher: ErrorStateMatcher = {
    isErrorState: () => this.isParentControlInErrorState(),
  };

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private readonly cdr: ChangeDetectorRef,
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get showRequiredError(): boolean {
    return this.isParentControlInErrorState() && !!this.requiredError;
  }

  ngOnInit(): void {
    const parent = this.ngControl?.control;
    if (parent) {
      this.parentStatusSub = parent.statusChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cdr.markForCheck());
    }

    this.valueChangesSub = this.displayControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((value): value is string => typeof value === 'string'),
        takeUntil(this.destroy$),
      )
      .subscribe((term) => {
        if (term === AUTOCOMPLETE_CREATE_NEW) {
          return;
        }
        this.lastTypedTerm = term;
        this.search.emit(term);
        this.clearStoredValueIfTextChanged(term);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] && this.storedValue != null && this.storedValue !== '') {
      this.syncDisplayFromStoredValue();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.valueChangesSub?.unsubscribe();
    this.parentStatusSub?.unsubscribe();
  }

  private isParentControlInErrorState(): boolean {
    const control = this.ngControl?.control;
    return !!(control?.invalid && control.hasError('required') && (control.touched || control.dirty));
  }

  get currentSearchTerm(): string {
    const raw = this.displayControl.value;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed === AUTOCOMPLETE_CREATE_NEW) {
        return this.lastTypedTerm.trim();
      }
      return trimmed;
    }
    if (raw && typeof raw === 'object') {
      return this.getLabel(raw as T).trim();
    }
    return '';
  }

  get showCreateOption(): boolean {
    const term = this.currentSearchTerm;
    if (!term) {
      return false;
    }
    const normalized = term.toLowerCase();
    return !this.options.some(
      (option) => this.getLabel(option).trim().toLowerCase() === normalized,
    );
  }

  displayWith = (value: T | string | null): string => {
    if (value == null || value === '') {
      return '';
    }
    if (typeof value === 'string') {
      if (value === AUTOCOMPLETE_CREATE_NEW) {
        return this.lastTypedTerm;
      }
      return value;
    }
    return this.getLabel(value);
  };

  getLabel(option: T): string {
    const record = option as Record<string, unknown>;
    const label = record[this.bindLabel];
    return label != null ? String(label) : '';
  }

  getOptionValue(option: T): unknown {
    return (option as Record<string, unknown>)[this.bindValue];
  }

  onCreateNewMousedown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.handleCreateNew();
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    if (event.option.value === this.createNewSentinel) {
      this.handleCreateNew();
      return;
    }

    const option = event.option.value as T;
    this.storedValue = this.getOptionValue(option);
    this.onChange(this.storedValue);
    this.markTouched();
  }

  onInputBlur(): void {
    this.markTouched();
  }

  onInputFocus(): void {
    const term = typeof this.displayControl.value === 'string' ? this.displayControl.value : '';
    this.search.emit(term);
  }

  onSuffixIconClick(event: MouseEvent, trigger: MatAutocompleteTrigger): void {
    if (this.displayControl.disabled) {
      return;
    }
    this.toggleDropdown(event, trigger);
  }

  toggleDropdown(event: MouseEvent, trigger: MatAutocompleteTrigger): void {
    event.stopPropagation();
    if (trigger.panelOpen) {
      trigger.closePanel();
    } else {
      this.displayControl.markAsTouched();
      trigger.openPanel();
      const term = typeof this.displayControl.value === 'string' ? this.displayControl.value : '';
      this.search.emit(term);
    }
  }

  writeValue(value: unknown): void {
    this.storedValue = value ?? null;
    this.syncDisplayFromStoredValue();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.displayControl.disable({ emitEvent: false });
    } else {
      this.displayControl.enable({ emitEvent: false });
    }
  }

  private handleCreateNew(): void {
    const term = this.lastTypedTerm.trim();
    this.displayControl.setValue(term, { emitEvent: false });
    this.createNew.emit(term);
    this.autocompleteTrigger?.closePanel();
    this.markTouched();
  }

  private clearStoredValueIfTextChanged(term: string): void {
    if (this.storedValue == null || this.storedValue === '') {
      return;
    }
    const match = this.findOptionByStoredValue();
    if (match && this.getLabel(match).trim() === term.trim()) {
      return;
    }
    this.storedValue = null;
    this.onChange(null);
  }

  private syncDisplayFromStoredValue(): void {
    if (this.storedValue == null || this.storedValue === '') {
      this.displayControl.setValue('', { emitEvent: false });
      return;
    }

    const match = this.findOptionByStoredValue();
    if (match) {
      this.displayControl.setValue(this.getLabel(match), { emitEvent: false });
      return;
    }

    if (typeof this.storedValue === 'string') {
      this.displayControl.setValue(this.storedValue, { emitEvent: false });
    }
  }

  private findOptionByStoredValue(): T | undefined {
    return this.options.find((option) => this.getOptionValue(option) === this.storedValue);
  }

  private markTouched(): void {
    this.onTouchedCallback();
  }
}