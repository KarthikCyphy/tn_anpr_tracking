import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthConstants } from '../../app/config/auth-constants';
import { AuthService } from '../../app-core/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    public authService: AuthService,
    public router: Router
  ) { }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    // Guard for user is login or not
    let user = null;
    if(localStorage.getItem(AuthConstants.AUTH) != null)
      user = JSON.parse(unescape(atob(localStorage.getItem(AuthConstants.AUTH))));
    this.authService.userData = user;
    console.log(this.authService.userData)
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/account/login']);
      return true
    }
    return true
  }
}
