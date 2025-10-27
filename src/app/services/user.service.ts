import { Injectable, signal, WritableSignal } from '@angular/core';

export interface UserData {
  name: string;
  email: string;
  role: string;
  experienceLevel?: string;
  interviewDuration?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {

    UserService() {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      this._sessionId.set(storedSessionId);
      this._user.set(JSON.parse(localStorage.getItem('user') || 'null'));
    }
  }

  clearSessionId() {
    this._sessionId.set(null);
    localStorage.removeItem('sessionId');
  }
  private _user: WritableSignal<UserData | null> = signal(null);
  private _sessionId: WritableSignal<string | null> = signal(null);

  setUser(user: UserData) {
    this._user.set(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  setSessionId(sessionId: string) {
    this._sessionId.set(sessionId);
    localStorage.setItem('sessionId', sessionId);
  }

  get sessionId(): string | null {
    // Prefer signal, fallback to localStorage
    return this._sessionId() || localStorage.getItem('sessionId');
  }

  get user(): UserData | null {
    return this._user();
  }

  clearUser() {
    this._user.set(null);
  }
}
