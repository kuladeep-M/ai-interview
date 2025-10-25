import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

export interface Interview {
  name: string;
  role: string;
  score: number;
  time: string;
  avatarClass: string;
}

export interface InterviewDetail {
  name: string;
  role: string;
  interviewTime: string;
  fitScore: number;
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

function getRandomColor(name: string): string {
  // Generate a pastel color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 80%)`;
}

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HrDashboardComponent {
  interviews: Interview[] = [
    { name: 'Sarah Chen', role: 'Senior Frontend Developer', score: 92, time: '2:30 PM Today', avatarClass: 'avatar-sarah' },
    { name: 'Michael Torres', role: 'Backend Engineer', score: 76, time: '1:00 PM Today', avatarClass: 'avatar-michael' },
    { name: 'Emma Rodriguez', role: 'UX Designer', score: 88, time: '11:30 AM Today', avatarClass: 'avatar-emma' },
    { name: 'David Kim', role: 'DevOps Engineer', score: 54, time: '10:00 AM Today', avatarClass: 'avatar-david' },
    { name: 'Lisa Wang', role: 'Product Manager', score: 91, time: 'Yesterday 4:00 PM', avatarClass: 'avatar-lisa' }
  ];

  selectedInterview: InterviewDetail = {
    name: 'Sarah Chen',
    role: 'Senior Frontend Developer',
    interviewTime: 'Oct 23, 2024 at 2:30 PM',
    fitScore: 92,
    duration: '45m',
    questionsAnswered: '12/15',
    confidenceLevel: 'High',
    technicalScore: '89%',
    avatarClass: 'avatar-sarah',
    qa: [
      {
        question: 'Explain the difference between React hooks and class components.',
        answer: 'React hooks allow us to use state and lifecycle methods in functional components, making them more concise and easier to test. Class components require more boilerplate code but were the traditional way before hooks were introduced in React 16.8.',
        aiFeedback: 'Excellent answer demonstrating clear understanding of React concepts. Shows practical knowledge of modern React development patterns.'
      },
      {
        question: 'How would you optimize a React application\'s performance?',
        answer: 'I would use React.memo for component memoization, implement code splitting with lazy loading, optimize bundle size, use useCallback and useMemo hooks appropriately, and implement virtual scrolling for large lists.'
      }
    ]
  };

  getInterviewDetail(interview: Interview): InterviewDetail {
    // For demo, only Sarah Chen has full details; others show basic info
    if (interview.name === 'Sarah Chen') {
      return this.selectedInterview;
    }
    return {
      name: interview.name,
      role: interview.role,
      interviewTime: interview.time,
      fitScore: interview.score,
      duration: '--',
      questionsAnswered: '--',
      confidenceLevel: '--',
      technicalScore: '--',
      avatarClass: interview.avatarClass,
      qa: []
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
