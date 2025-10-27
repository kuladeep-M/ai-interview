import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AIStreamService } from '../../services/ai-stream.service';


export interface InterviewDetail {
  id: number;
  name: string;
  role: string;
  interviewTime: string;
  score: number;
  duration: string;
  questionsAnswered: string;
  confidenceLevel: string;
  domainScore: string;
  overallSummary: string;
  avatarClass: string;
}

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HrDashboardComponent  {
  
  constructor(private aiService: AIStreamService) {
    this.aiService.getInterviewData().subscribe((data: any) => {
      if (data && typeof data === 'object') {
        this.interviews = Object.entries(data).map(([id, entry]: [string, any], idx) => {
          // Parse response if present
          let parsed = entry;
          if (typeof entry.response === 'string') {
            try {
              parsed = { ...entry, ...JSON.parse(entry.response) };
            } catch {}
          }
          // Try to get userData if present
          const userData = parsed.userData || {};
          console.log('Parsed interview entry:', parsed);
          // Defensive: ensure domain_score and generic_score are numbers
          const domainScore = typeof parsed.domain_evaluation?.domain_score === 'number' ? parsed.domain_evaluation.domain_score : Number(parsed.domain_evaluation?.domain_score) || 0;
          
          return {
            id: idx + 1,
            name: userData.name || parsed.candidate_name || 'Unknown',
            role: userData.role || parsed.domain_evaluation?.domain_name || parsed.job_role || 'Unknown',
            interviewTime: parsed.created_date || 'Unknown',
            score: Math.round((parsed.overall_score || 0) * 10),
            duration: userData.interviewDuration || parsed.duration || 'N/A',
            questionsAnswered: parsed.questionsAnswered || 'N/A',
            confidenceLevel: parsed.confidence_level ? (parsed.confidence_level > 0.8 ? 'High' : parsed.confidence_level > 0.5 ? 'Medium' : 'Low') : 'N/A',
            domainScore: domainScore !== undefined ? `${domainScore * 10}%` : 'N/A',
            avatarClass: 'avatar-default',
            overallSummary: parsed.feedback || 'No summary available.'
          };
        });
        console.log('Loaded interviews:', this.interviews);
      }
    });
  }


  interviews: InterviewDetail[] = [];
  selectedInterview: InterviewDetail | null = null;
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