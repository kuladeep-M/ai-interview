import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-interview-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-start.component.html',
  styleUrls: ['./interview-start.component.scss']
})
export class InterviewStartComponent {
  name: string = '';
  email: string = '';
  role: string = '';
  roles: string[] = ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Data Scientist', 'DevOps Engineer'];

  constructor(private router: Router) {}

  startInterview() {
    // You can add validation and API call here
    // For now, just navigate to the interview
    this.router.navigate(['/ai-interview']);
  }
}
