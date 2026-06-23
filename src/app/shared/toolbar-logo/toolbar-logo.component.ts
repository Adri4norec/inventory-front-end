import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-toolbar-logo',
  standalone: true,
  template: `
    <button
      type="button"
      class="toolbar-logo-btn"
      (click)="goHome()"
      aria-label="Ir para a página inicial">
      <img
        class="toolbar-logo"
        src="shared/image/irt-logo-white.png"
        alt="Instituto de Tecnologia Reconcavo"
      />
    </button>
  `,
  styles: [`
    .toolbar-logo-btn {
      border: none;
      background: transparent;
      padding: 0;
      margin: 0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    .toolbar-logo-btn:focus-visible {
      outline: 2px solid var(--irt-white, #ffffff);
      outline-offset: 3px;
      border-radius: 4px;
    }
  `],
})
export class ToolbarLogoComponent {
  private static readonly HOME_ROUTE = '/inventario';

  constructor(private readonly router: Router) {}

  goHome(): void {
    const path = this.router.url.split('?')[0].split('#')[0];
    if (path !== ToolbarLogoComponent.HOME_ROUTE) {
      void this.router.navigateByUrl(ToolbarLogoComponent.HOME_ROUTE);
    }
  }
}
