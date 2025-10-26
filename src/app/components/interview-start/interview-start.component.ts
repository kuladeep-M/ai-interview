import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AIStreamService } from '../../services/ai-stream.service';

@Component({
  selector: 'app-interview-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-start.component.html',
  styleUrls: ['./interview-start.component.scss']
})
export class InterviewStartComponent {
  ngOnInit() {
    if (this.userService.sessionId) {
      this.router.navigate(['/ai-interview']);
    }
  }
  name: string = '';
  email: string = '';
  role: string = '';
  roles: string[] = ['Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'Data Scientist', 'DevOps Engineer'];

  constructor(
    private router: Router,
    private userService: UserService,
    private aiStreamService: AIStreamService
  ) {}

  startInterview() {
    // Store user details in service
    this.userService.setUser({
      name: this.name,
      email: this.email,
      role: this.role
    });

    // Navigate to interview screen
    this.router.navigate(['/ai-interview']);
  }
}
