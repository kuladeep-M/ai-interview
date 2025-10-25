import { Routes } from '@angular/router';
import { HrDashboardComponent } from './components/hr-dashboard/hr-dashboard.component';
import { AiInterviewComponent } from './components/ai-interview/ai-interview.component';

export const routes: Routes = [
    { path: '', component: AiInterviewComponent },
    { path: 'hr-dashboard', component: HrDashboardComponent },
];
