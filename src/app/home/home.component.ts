import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbPaginationConfig } from '@ng-bootstrap/ng-bootstrap';
import jsPDF from 'jspdf';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app-core/auth/auth.service';
import { CommonUiService } from 'src/app-core/services/common-ui.service';
import { HttpService } from 'src/app-core/services/http.service';
import { LoaderService } from 'src/app-core/services/loader.service';
import { CommonConstants } from 'src/app-core/constants/common-constants';
import * as moment from 'moment';

// import * as _ from 'lodash';
import 'lodash';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { Message } from '@angular/compiler/src/i18n/i18n_ast';
declare var _:any;


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None,

})
export class HomeComponent implements OnInit {

  componentSubscriptions: Subscription = new Subscription();
  public messages: Subject<Message>;
  
  @ViewChild('vehicleSearchListContenet') templateRef: TemplateRef<any>;

  constructor(
    private router: Router,
    private httpService: HttpService,
    private toastService: ToastrService,
    public authService: AuthService,
    private modalService: NgbModal,
    private commonUIComponent: CommonUiService,
    private loaderService: LoaderService,
    config: NgbPaginationConfig,
    private fb: FormBuilder,

  ) {
    if (authService.userData.roles[0] == 'Operator') {
      this.toastService.error('Unauthorised page access.');
      authService.forceLogout();
    }
  }

  pageSize = CommonConstants.dataTableConstant.pageSize;
  page = CommonConstants.dataTableConstant.page;

  selectedTypeofList: string;
  showDatepicker: boolean = false;
  selectedDate: any = {};
  today: string;
  fromDate: string;
  toDate: string;

  vehicleMovementList: any = [];
  filterTerm: string;
  selectedVehicleInfo: any = {};

  vehicleInfoForm: FormGroup;

  selectedEventData: any = {};

  vehiclesListData: any = [];

  // For download PDF
  title = 'Vehicle Movement List';
  head = [['Vehicle Number', 'Vehicle Type',]];
  data = [];
  currentDateandTime: any = {'date': '', 'time': ''};

  onDateTimeModified(){
    if (this.fromDate != null && this.toDate != null) {
      if(new Date(this.fromDate) >= new Date(this.toDate)){
        this.toastService.error('Invalid date range.');
        return;
      }

      this.showDatepicker = false;
      this.getListMovements('byDate');
    }
  }

  dateFormater(date: any) {
    const convertedDate = new Date(date);
    let finalDate = (moment(convertedDate).format('DD-MM-YYYY') + ' ' + moment(convertedDate).format('HH:mm'));
    return finalDate;
  }

  onClickTypeChange(type: string) {
    this.vehicleMovementList = [];
    this.selectedDate = {};
    if (type == 'todays')
      this.getListMovements(type);
    else
      this.fromDate = null; this.toDate = null;
  }

  ngOnInit(): void {
    this.selectedTypeofList = 'todays';
    this.today = this.dateFormater(new Date());
    this.currentDateandTime.date = this.dateFormater(new Date());
    this.getListMovements(this.selectedTypeofList);

    this.componentSubscriptions.add(this.commonUIComponent.getSideNavToggleValue.subscribe((data: any) => {
      if (!this.commonUIComponent.isEmptyObject(data)) {
        this.vehiclesListData = data.returnObject;
        this.modalService.open(this.templateRef, { size: 'xl', backdrop: 'static', centered: true });
      }
    }));
  }

  getCurrentDateAndTime() {
    this.currentDateandTime.date = this.dateFormater(new Date()).split(' ')[0];
    this.currentDateandTime.time = this.dateFormater(new Date()).split(' ')[1];
  };

  getListMovements(type: string) {
    let inputData = {'fromDateTime': '', 'toDateTime': ''};
    if (type == 'todays') {
      this.selectedDate = {};
      this.fromDate = null; this.toDate = null;
      inputData = {
        "fromDateTime": this.today.split(" ")[0] + " 00:00:00",
        "toDateTime": this.today.split(" ")[0] + " 23:59:59"
      };
      this.selectedDate = { 
        'fromDate': inputData.fromDateTime.substring(0, inputData.fromDateTime.length - 3),                       
        "toDate": inputData.toDateTime .substring(0, inputData.toDateTime.length - 3) };
    } else {
      if (this.fromDate != null && this.toDate != null) {
        this.selectedDate = {};
        inputData = {
          "fromDateTime": this.dateFormater(this.fromDate)+":59",
          "toDateTime": this.dateFormater(this.toDate)+":59"
        };
        this.selectedDate = { 
          'fromDate': inputData.fromDateTime.substring(0, inputData.fromDateTime.length - 3),                       
          "toDate": inputData.toDateTime.substring(0, inputData.toDateTime.length - 3) };
      }
    }

    if (!this.commonUIComponent.isEmptyObject(inputData)) {      
      this.httpService.post('vvadmin/getvehicletrackingdetailsbetweendates', { "requestParams": inputData }).subscribe(
        (response: any) => {
          this.vehicleMovementList = response.returnObject;
          this.filterTerm = ''; this.page = 1;
          let tempArr =[];
          _.cloneDeep(response.returnObject).forEach((value,key) => {
            const data = {
              'vehicleNumber': value.vehicleNumber, 
              'vehicleType': value.vehicleType, 
            }
            tempArr.push(data);
            if(key == response.returnObject.length -1)
              this.data = this.commonUIComponent.convertDataToDownloadPDF(_.cloneDeep(tempArr));
          });
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
        });
    }

    this.vehicleInfoForm = this.fb.group({     
      vehicleNumber: ['', [Validators.required]],
      vehicleType: ['', [Validators.required]],
    });
  }

  openViewDetailsModal(content, rowClickedData: any, modalType) {
    if(rowClickedData){
      this.selectedEventData = {};
      this.httpService.post('irakshan/fetchimage', {"requestParams" : { 'imageFilePath': rowClickedData.imagePath }}).subscribe(
        (response: any) => {
          this.selectedEventData.snapshotPath = response.returnObject;
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      }); 
      this.selectedEventData = rowClickedData;
      this.selectedEventData.vehicleNumber = this.commonUIComponent.vehicleNumberFormatter(rowClickedData.vehicleNumber);
      this.modalService.open(content, { size: modalType == 'viewSnapshot' ? 'lg' : 'xl', backdrop: 'static', centered: true });     
    }
  }

  onSaveCorrectedVehicleData() {
    if(this.selectedEventData.id){
      let inputData = {
        "id": this.selectedEventData.id,
        "vehicleNumber": this.commonUIComponent.rawVehicleNumberFormatte(this.selectedEventData.vehicleNumber),
        "vehicleType": this.selectedEventData.vehicleType,
        "time": this.selectedEventData.time,
        "remarks": this.selectedEventData.remarks,
        "verifiedBy": this.selectedEventData.verifiedBy,
        "imagePath": this.selectedEventData.imagePath,
        "ilprJson": this.selectedEventData.ilprJson,
        "vehicleListingType": this.selectedEventData.vehicleListingType,
        "vehicleEntryTime": this.selectedEventData.vehicleEntryDate,
        "vehicleEntryDate": this.selectedEventData.vehicleEntryDate,
      }
      this.httpService.post('vvadmin/addorupdatevehicletrackingdetails', { "requestParams" : inputData }).subscribe(
        (response: any) => {
          if(response.success){
            this.toastService.success('Vehicle details updated successfully');
            this.modalService.dismissAll();
          }
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }
  }

  openSnapshotModal(content, imagePath: string, vehicleNumber: string, vehicleType: string) {
    this.httpService.post('irakshan/fetchimage', { "requestParams": { 'imageFilePath': imagePath } }).subscribe(
      (response: any) => {
        this.modalService.open(content, { size: 'lg', backdrop: 'static', centered: true });
        this.selectedVehicleInfo.snapshotPath = response.returnObject;
        this.selectedVehicleInfo.vehicleNumber = vehicleNumber;
        this.selectedVehicleInfo.vehicleType = vehicleType;
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
      });
  }

  downloadDataAsPdf() {
    var doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(this.title, 11, 8);
    doc.setFontSize(11);
    doc.setTextColor(100);


    (doc as any).autoTable({
      head: this.head,
      body: this.data,
      theme: 'plain',
      didDrawCell: data => {
        // console.log(data.column.index)
      }
    })

    // below line for Open PDF document in new tab
    // doc.output('dataurlnewwindow')

    // below line for Download PDF document  
    this.getCurrentDateAndTime();
    doc.save(this.title+'-'+ this.currentDateandTime.date +'-'+ this.currentDateandTime.time +'.pdf');
  }

}
