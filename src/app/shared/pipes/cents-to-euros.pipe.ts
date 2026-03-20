import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'centsToDollars',
  standalone: true,
})
export class CentsToDollarsPipe implements PipeTransform {
  transform(cents: number | undefined | null): string {
    if (cents === undefined || cents === null) return '0,00 $';
    const dollars = cents / 100;
    return dollars.toLocaleString('fr-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' $';
  }
}
