import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-thank-you',
  standalone: true,
  templateUrl: './thank-you.component.html',
  styleUrls: ['./thank-you.component.scss']
})
export class ThankYouComponent {
  private router = inject(Router);
  private userService = inject(UserService);

  takeInterview() {
    this.userService.clearSessionId();
    this.router.navigate(['/']);
  }
}
