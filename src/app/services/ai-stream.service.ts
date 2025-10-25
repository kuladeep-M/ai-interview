import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AIStreamService {
  private ws: WebSocket | null = null;
  private responseSubject = new Subject<string>();
  public response$: Observable<string> = this.responseSubject.asObservable();

  constructor(private zone: NgZone) {}

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
