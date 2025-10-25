import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiInterviewComponent } from "./components/ai-interview/ai-interview.component";
import { HrDashboardComponent } from "./components/hr-dashboard/hr-dashboard.component";

@Component({
  selector: 'app-root',
  imports: [ AiInterviewComponent, HrDashboardComponent, RouterOutlet ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ai-interview');
}
