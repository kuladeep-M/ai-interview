import { Injectable, NgZone } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AIStreamService {
  private apiUrl = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';

  constructor(
    private zone: NgZone,
    private http: HttpClient,
    private userService: UserService
  ) { }
  headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'x-api-key': 'sk-default-foozTPqe8GkoFaixlysYmVPb528bCo7v'
  });
  public sendMessageToModel(chatMessage: string, contex?: any): Observable<any> {
    console.log('Sending message to model:', chatMessage);
    let sessionId = this.userService?.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      if (this.userService) {
        this.userService.setSessionId(sessionId);
      }
    }
   
    const payload = {
      role: "system",
      user_id: 'mem_cm7xmg15v0ghk0snc9yx26g1v',
      system_prompt_variables: {},
      agent_id: '68f951b6058210757bf615af',
      session_id: sessionId,
      message: JSON.stringify({ role: "user", context: contex || {}, message: chatMessage })
    };

    return this.http.post(this.apiUrl, payload, { headers: this.headers, responseType: 'json' });
  }

  private ws: WebSocket | null = null;
  private responseSubject = new Subject<string>();
  public response$: Observable<string> = this.responseSubject.asObservable();

  // Removed duplicate constructor

  connect(url: string): void {
    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      this.zone.run(() => {
        this.responseSubject.next(event.data);
      });
    };
    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  sendUserMessage(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  storeHistory(history: any) {
    const payload = {
      role: "system",
      user_id: 'mem_cm7xmg15v0ghk0snc9yx26g1v',
      system_prompt_variables: {},
      agent_id: '68fe20eba39d463331e03c5c',
      session_id: uuidv4(),
      message: (JSON.stringify(history))
    };
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': 'sk-default-mQGXmVH9iXVv4Ao54nxsBGsgJxSqEJZs'
    }
    const userData = this.userService.user;
    // Store in Lyzr API
    this.http.post(this.apiUrl, payload, { headers, responseType: 'json' }).subscribe({
      next: (r:any) => {
        this.http.post('https://ai-interviewer---v1-default-rtdb.firebaseio.com/interview-data.json', JSON.stringify({ ...JSON.parse(r?.response?.replace(/\r?\n/g, '\\n')), created_date: new Date().toISOString(),userData}) , { headers: header }).subscribe({
          next: () => {
            console.log('History stored successfully (Firebase)');
          },
          error: (err) => {
            console.error('Error storing history (Firebase):', err);
          }
        });
        console.log('History stored successfully (Lyzr API)');
      },
      error: (err) => {
        console.error('Error storing history (Lyzr API):', err);
      }
    });
    const header = {
      'Content-Type': 'application/json',
      "apiKey": "AIzaSyBapY7RsmmgbBZ8zbs9HtFENmkTMR0qMWA",
    }

    // Store in Firebase (replace with your actual Firebase endpoint)

  }

  getInterviewData() {
    return this.http.get('https://ai-interviewer---v1-default-rtdb.firebaseio.com/interview-data.json');
  }
}
