import { Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { CentsToDollarsPipe } from '../../pipes/cents-to-euros.pipe';

@Component({
  selector: 'app-balance-chip',
  imports: [MatChipsModule, CentsToDollarsPipe],
  template: `
    <mat-chip-set>
      <mat-chip [class.negative]="balance() < 0" [highlighted]="balance() < 0">
        Solde: {{ balance() | centsToDollars }}
      </mat-chip>
    </mat-chip-set>
  `,
  styles: `
    .negative {
      --mat-chip-label-text-color: #d32f2f;
    }
  `,
})
export class BalanceChipComponent {
  balance = input.required<number>();
}
