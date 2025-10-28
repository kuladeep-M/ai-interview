import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AIStreamService } from '../../services/ai-stream.service';

export interface JobRoleOption {
  value: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-interview-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-start.component.html',
  styleUrls: ['./interview-start.component.scss']
})
export class InterviewStartComponent implements OnInit{
  ngOnInit() {
    if (this.userService.sessionId) {
      this.router.navigate(['/ai-interview']);
    }
  }
  name: string = '';
  email: string = '';
  role: string = '.NET Developer';
  experienceLevel: string = '2-4 years';
  interviewDuration: string = '10min';

  jobRoles: JobRoleOption[] = [
    {
      value: '.NET Developer',
      label: 'Dotnet Developer',
      description: 'Responsible for designing, developing, and maintaining scalable .NET applications and services. Collaborates with cross-functional teams to deliver robust solutions, writes clean and efficient code, and troubleshoots production issues. Experience with ASP.NET, C#, REST APIs, and cloud platforms preferred.'
    },
    {
      value: 'QA Engineer',
      label: 'QA Engineer',
      description: 'Ensures software quality by developing and executing test plans, test cases, and automated scripts. Works closely with development teams to identify defects, verify fixes, and improve processes. Experience with manual and automated testing tools, bug tracking, and Agile methodologies required.'
    },
    {
      value: 'sql Developer',
      label: 'SQL Developer',
      description: 'Designs, implements, and optimizes SQL databases and queries. Responsible for data modeling, writing stored procedures, and ensuring data integrity and performance. Experience with MS SQL Server, T-SQL, ETL processes, and reporting tools is a plus.'
    },
    {
      value: 'DevOps Engineer',
      label: 'DevOps Engineer',
      description: 'Builds and maintains CI/CD pipelines, automates infrastructure, and manages cloud deployments. Works with development and operations teams to streamline releases, monitor systems, and ensure high availability. Experience with Docker, Kubernetes, cloud platforms (AWS/Azure/GCP), and scripting required.'
    },
    {
      value: 'Automation Testing',
      label: 'Automation Testing',
      description: 'Develops and maintains automated test frameworks and scripts to ensure software reliability. Collaborates with QA and development teams to integrate automated tests into CI/CD pipelines. Experience with Selenium, Cypress, or similar tools, and programming in JavaScript, Python, or Java preferred.'
    },
    {
      value: 'Content Writing',
      label: 'Content Writing',
      description: 'Creates, edits, and manages technical and non-technical content for websites, blogs, documentation, and marketing materials. Works with subject matter experts to produce clear, engaging, and accurate content. Strong writing, research, and communication skills required.'
    }
  ];

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
      role: this.role,
      description: this.jobRoles.find(job => job.value === this.role)?.description || '',
      experienceLevel: this.experienceLevel,
      interviewDuration: this.interviewDuration
    });

    // Navigate to interview screen
    this.router.navigate(['/ai-interview']);
  }
}
