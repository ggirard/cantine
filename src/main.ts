import { bootstrapApplication } from '@angular/platform-browser';
import { initializeApp } from 'firebase/app';
import { environment } from './environments/environment';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Initialiser Firebase avant Angular
initializeApp(environment.firebase);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
