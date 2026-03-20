import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'cantine-theme';
  private themeSubject = new BehaviorSubject<Theme>(this.loadTheme());

  readonly theme$ = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  toggle(): void {
    const next = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  private loadTheme(): Theme {
    const saved = localStorage.getItem(this.storageKey) as Theme | null;
    if (saved) return saved;
    // Respecter la préférence système
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }
}
