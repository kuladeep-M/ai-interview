import { Injectable, signal, WritableSignal } from '@angular/core';

export interface UserData {
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private _user: WritableSignal<UserData | null> = signal(null);

  setUser(user: UserData) {
    this._user.set(user);
  }

  get user(): UserData | null {
    return this._user();
  }

  clearUser() {
    this._user.set(null);
  }
}
