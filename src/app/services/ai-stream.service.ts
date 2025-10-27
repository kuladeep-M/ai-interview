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
  ) {}

  public sendMessageToModel(message: string): Observable<any> {
    console.log('Sending message to model:', message);
    let sessionId = this.userService?.sessionId;
    if (!sessionId) {
      sessionId = uuidv4();
      if (this.userService) {
        this.userService.setSessionId(sessionId);
      }
    }
    const payload = {
      role:"system",
      user_id: 'mem_cm7xmg15v0ghk0snc9yx26g1v',
      system_prompt_variables: {},
      agent_id: '68f951b6058210757bf615af',
      session_id: sessionId,
      message
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': 'sk-default-foozTPqe8GkoFaixlysYmVPb528bCo7v'
    });
    return this.http.post(this.apiUrl, payload, { headers, responseType: 'json' });
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
}
