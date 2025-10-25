import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';



export interface InterviewDetail {
  id: number;
  name: string;
  role: string;
  interviewTime: string;
  score: number;
  duration: string;
  questionsAnswered: string;
  confidenceLevel: string;
  technicalScore: string;
  qa: Array<{
    question: string;
    answer: string;
    aiFeedback?: string;
  }>;
  avatarClass: string;
}

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HrDashboardComponent implements OnInit {
  interviews :InterviewDetail[] = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'Senior Frontend Developer',
      interviewTime: 'Oct 23, 2024 at 2:30 PM',
      score: 92,
      duration: '45m',
      questionsAnswered: '12/15',
      confidenceLevel: 'High',
      technicalScore: '89%',
      avatarClass: 'avatar-sarah',
      qa: [
        {question: 'Tell me about yourself.', answer: 'I am a frontend developer with 5 years of experience...', aiFeedback: 'Good introduction, but could include more about specific skills.'},
        {question: 'Describe a challenging project you worked on.', answer: 'I led a migration from AngularJS to Angular 12...', aiFeedback: 'Strong leadership, mention technical hurdles.'},
        {question: 'How do you ensure code quality?', answer: 'I use unit tests, code reviews, and linters...', aiFeedback: 'Good practices, could mention CI/CD.'}
      ]
    },
    {
      id: 2,
      name: 'Michael Torres',
      role: 'Backend Engineer',
      interviewTime: 'Oct 23, 2024 at 1:00 PM',
      score: 76,
      duration: '40m',
      questionsAnswered: '10/15',
      confidenceLevel: 'Medium',
      technicalScore: '75%',
      avatarClass: 'avatar-michael',
      qa: [
        {question: 'What is RESTful API?', answer: 'RESTful API is an architectural style for designing networked applications...', aiFeedback: 'Clear explanation, but could mention examples.'},
        {question: 'How do you handle database migrations?', answer: 'I use tools like Flyway and Liquibase...', aiFeedback: 'Good, mention rollback strategies.'},
        {question: 'Explain error handling in Node.js.', answer: 'I use try-catch blocks and error middleware...', aiFeedback: 'Solid, could discuss logging.'}
      ]
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      role: 'UX Designer',
      interviewTime: 'Oct 23, 2024 at 11:30 AM',
      score: 88,
      duration: '50m',
      questionsAnswered: '14/15',
      confidenceLevel: 'High',
      technicalScore: '85%',
      avatarClass: 'avatar-emma',
      qa: [
        {question: 'How do you approach user research?', answer: 'I start by identifying target users and conducting interviews...', aiFeedback: 'Comprehensive approach, well done.'},
        {question: 'Describe your design process.', answer: 'I follow a user-centered design process...', aiFeedback: 'Clear steps, could mention prototyping.'},
        {question: 'How do you handle feedback?', answer: 'I collect feedback through surveys and usability tests...', aiFeedback: 'Good, mention iteration.'}
      ]
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'DevOps Engineer',
      interviewTime: 'Oct 23, 2024 at 10:00 AM',
      score: 54,
      duration: '30m',
      questionsAnswered: '8/15',
      confidenceLevel: 'Low',
      technicalScore: '60%',
      avatarClass: 'avatar-david',
      qa: [
        {question: 'Explain CI/CD.', answer: 'CI/CD stands for Continuous Integration and Continuous Deployment...', aiFeedback: 'Basic understanding, could elaborate more.'},
        {question: 'How do you monitor production systems?', answer: 'I use Prometheus and Grafana for monitoring...', aiFeedback: 'Good, could mention alerting.'},
        {question: 'Describe your experience with Docker.', answer: 'I build and deploy containers for microservices...', aiFeedback: 'Solid, could discuss orchestration.'}
      ]
    }
  ]

  selectedInterview: InterviewDetail | null = null;

  ngOnInit() {
    // Set default selected interview
    this.selectedInterview = this.getInterviewDetail(this.interviews[0].id);
  }

  getInterviewDetail(id: number): InterviewDetail | null {
    const interview = this.interviews.find(interview => interview.id === id);
    if (!interview) return null;

    return {
      id: interview.id,
      name: interview.name,
      role: interview.role,
      interviewTime: interview.interviewTime,
      score: interview.score,
      duration: interview.duration,
      questionsAnswered: interview.questionsAnswered,
      confidenceLevel: interview.confidenceLevel,
      technicalScore: interview.technicalScore,
      avatarClass: interview.avatarClass,
      qa: interview.qa
    };
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '';
  }
  getAvatarStyle(name: string): any {
    return {
      'background': getRandomColor(name),
      'color': '#222',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'font-weight': '700',
      'font-size': '1.2rem',
      'border-radius': '50%'
    };
  }
}

function getRandomColor(name: string): string {
  // Generate a pastel color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 80%)`;
}
