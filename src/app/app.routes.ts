import { Routes } from '@angular/router';
import { HrDashboardComponent } from './components/hr-dashboard/hr-dashboard.component';
import { AiInterviewComponent } from './components/ai-interview/ai-interview.component';
import { InterviewStartComponent } from './components/interview-start/interview-start.component';
import { ThankYouComponent } from './components/thank-you/thank-you.component';
import { SessionGuard } from './guards/session.guard';

export const routes: Routes = [
    { path: '', component: InterviewStartComponent },
    { path: 'ai-interview', component: AiInterviewComponent, canActivate: [SessionGuard] },
    { path: 'hr-dashboard', component: HrDashboardComponent },
    { path: 'thank-you', component: ThankYouComponent },
    {path: '**', redirectTo: '' }
];
