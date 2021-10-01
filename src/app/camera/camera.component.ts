import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app-core/auth/auth.service';
import { HttpService } from 'src/app-core/services/http.service';
import { LoaderService } from 'src/app-core/services/loader.service';
declare var require
const Swal = require('sweetalert2')

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.scss'],    
  encapsulation: ViewEncapsulation.None,
})
export class CameraComponent implements OnInit {

  cameraForm: FormGroup;

  constructor(
    private _router: Router,
    private fb: FormBuilder,
    private httpService : HttpService,
    private toastService: ToastrService,
    public authService: AuthService,
    private loaderService: LoaderService,

  ) { 
    if(authService.userData.roles[0] == 'Operator'){
      this.toastService.error('Unauthorised page access.');
      authService.forceLogout();
    }
  }

  cameraListData : any = [];
  gateListData : any = [];
  lightControllerListData : any = [];
  typeOfForm: string;
  cameraData:any = {};
  filterTerm: string;

  initMethod() {
    this.httpService.post('vvadmin/getallcameras', {"requestParams" : {}}).subscribe(
      (response: any) => {
        this.cameraListData = response.returnObject;
        this.filterTerm = '';
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });

    this.httpService.post('vvadmin/getallgates', {"requestParams" : {}}).subscribe(
      (response: any) => {
        this.gateListData = response.returnObject;
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });

    this.httpService.post('vvadmin/getalllightcontrollers', {"requestParams" : {}}).subscribe(
      (response: any) => {
        this.lightControllerListData = response.returnObject;
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });

    this.typeOfForm = 'Add';
    this.cameraData = {
      "cameraId": "", "cameraType": "", "cameraIp": "", "cameraPort": "",
      "cameraUserName": "", "cameraPassword": "", "cameraRtspURL": "", "gateId": "",
      "lightControllerId": ""
    };
    this.cameraData.cameraType = '';
    this.cameraData.gateId = '';
    this.cameraData.lightControllerId = '';
    this.cameraForm = this.fb.group({
      cameraId: ['', [Validators.required]],
      cameraType: ['', [Validators.required]],
      cameraIp: ['', [Validators.required]],
      cameraPort: ['', [Validators.required]],
      cameraUserName: ['', [Validators.required]],
      cameraPassword: ['', [Validators.required]],
      cameraRtspURL: ['', [Validators.required]],
      gateId: ['', [Validators.required]],
      lightControllerId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.initMethod();
  } 

  onRowClicked(rowClickedData: any) {
    console.log(rowClickedData)
    this.cameraData = rowClickedData;
    this.typeOfForm = 'Edit';
  }

  onResetForm() {
    this.initMethod();
  }

  onSubmit() {
    if(this.cameraForm.valid){
      // if(this.cameraData.id == undefined)
      //   // this.cameraData['ccId'] = this.authService.userData.procurementUnit.procurementUnitId;

      this.httpService.post('vvadmin/addorupdatecamera', {"requestParams" : this.cameraData}).subscribe(
        (response: any) => {
          if(response.success){
            this.toastService.success(this.cameraData.id == undefined ? 'Camera created successfully' : 'Camera updated successfully');
            this.onResetForm();
            this.loaderService.hide();
          }
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }
  };

  onDeleteCamera(rowClickedId: string) {
    Swal.fire({
      title: 'Are you sure you want to delete ?',
      text: "",
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {      
      if (result.value) {
        this.httpService.post('vvadmin/deletecamera', {"requestParams" : rowClickedId}).subscribe(
          (response: any) => {
            if(response.success){
              this.loaderService.hide();
              Swal.fire(
                'Deleted!',
                'Camera has been deleted.',
                'success'
              )
              this.onResetForm();
            }
          },
          (error) => { //error() callback
            this.httpService.serverErrorMethod(error);
        });
      }
    })
  }

}
