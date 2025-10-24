import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiInterviewComponent } from "./components/ai-interview/ai-interview.component";

@Component({
  selector: 'app-root',
  imports: [ AiInterviewComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ai-interview');
}
