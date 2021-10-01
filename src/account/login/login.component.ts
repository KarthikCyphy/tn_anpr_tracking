import { Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Platform } from '@angular/cdk/platform';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../../app-core/services/http.service';
import { AuthConstants } from 'src/app/config/auth-constants';
import { AuthService } from '../../app-core/auth/auth.service';


type UserFields = 'loginId' | 'password';
type FormErrors = { [u in UserFields]: string };

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public newUser = false;
  public loginForm: FormGroup;
  public formErrors: FormErrors = {
    'loginId': '',
    'password': '',
  };
  public errorMessage: any;
  public showLoader: boolean = false;

  loginData:any = {};
  loginWithPinData:any = {};
  isShowLoginwithPin: boolean = false;
  pinAlertOpened: boolean = true;

  constructor(
    private router: Router,
    public ngZone: NgZone,
    private authService: AuthService,
    private toastService: ToastrService,
    private platform: Platform,
    private httpService: HttpService,
    private formBuilder: FormBuilder   
    ) {
    this.loginForm = formBuilder.group({
      loginId: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {}

  // Simple Login
  login() {
    if(this.loginForm.valid) {
      this.authService.login(this.loginData);        
    }
  }

  forceLogout() {
    this.authService.logout();
  }

  onForgetPassword() {
    
  }
}
