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

    this.uploadForm = this.fb.group({
      upload: [''],
    })
  }

  pageSize = CommonConstants.dataTableConstant.pageSize;
  page = CommonConstants.dataTableConstant.page;

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
  selectedVideoSources: string = 'All Videos';
  videoSourcesLists: any = [];

  // For download PDF
  title = 'Vehicle Movement List';
  head = [['Vehicle Number', 'Vehicle Type', 'Make', 'Model', 'Color', 'Updated On']];
  data = [];
  currentDateandTime: any = {'date': '', 'time': ''};

  fileName: string = "No file selected";
  file: File;
  uploadForm: FormGroup;

  onDateTimeModified(){
    if (this.fromDate != null && this.toDate != null) {
      if(new Date(this.fromDate) >= new Date(this.toDate)){
        this.toastService.error('Invalid date range.');
        return;
      }
      this.getListMovements();
    }
  }

  dateFormater(date: any) {
    const convertedDate = new Date(date);
    let finalDate = (moment(convertedDate).format('DD-MM-YYYY') + ' ' + moment(convertedDate).format('HH:mm'));
    return finalDate;
  }

  ngOnInit(): void {
    this.today =(moment(new Date()).format('YYYY-MM-DD') + 'T') ;
    this.fromDate = this.today + '00:00:00+05:30'; 
    this.toDate = this.today + '23:59:59+05:30';
  
    this.currentDateandTime.date = this.dateFormater(new Date());
    this.getListMovements();

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

  getListMovements() {
    let inputData = {'fromDateTime': '', 'toDateTime': ''};
   
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

    if (!this.commonUIComponent.isEmptyObject(inputData)) {    
      this.videoSourcesLists = [];  
      this.selectedEventData = {};

      this.httpService.post('offlinevi/getvehicletrackingdetailsbetweendates', { "requestParams": inputData }).subscribe(
        (response: any) => {
          this.vehicleMovementList = response.returnObject;
          this.filterTerm = ''; this.page = 1;
          let tempArr =[];
          _.cloneDeep(response.returnObject).forEach((value,key) => {
            const data = {
              'vehicleNumber': value.vehicleNumber, 
              'vehicleType': value.vehicleType, 
              'make': value.make,
              'model': value.model,
              'color': value.color,
              'updatedOn': value.updatedOn
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

      this.httpService.post('offlinevi/getallvideosourcesbetweendateandtime', { "requestParams": inputData }).subscribe(
        (response: any) => {
          this.videoSourcesLists = response.returnObject;
          if(this.videoSourcesLists.length >= 1)
            this.videoSourcesLists.unshift('All Videos');
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

  getListMovementsByVideoSources() {
    if(this.selectedVideoSources != 'All Videos'){    
      let inputData =  this.selectedVideoSources;

      this.vehicleMovementList = [];
      this.selectedEventData = {};

      this.httpService.post('offlinevi/getvehiclemovmentdetailsbyvideosource', { "requestParams": inputData }).subscribe(
        (response: any) => {
          this.vehicleMovementList = response.returnObject;
          this.filterTerm = ''; this.page = 1;
          let tempArr =[];
          _.cloneDeep(response.returnObject).forEach((value,key) => {
            const data = {
              'vehicleNumber': value.vehicleNumber, 
              'vehicleType': value.vehicleType, 
              'make': value.make,
              'model': value.model,
              'color': value.color,
              'updatedOn': value.updatedOn
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

      this.vehicleInfoForm = this.fb.group({     
        vehicleNumber: ['', [Validators.required]],
        vehicleType: ['', [Validators.required]],
      });
    }else{
      this.getListMovements();
    }
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
      this.selectedEventData = _.cloneDeep(rowClickedData);
      this.selectedEventData.vehicleNumber = this.commonUIComponent.vehicleNumberFormatter(this.selectedEventData.vehicleNumber);
      this.modalService.open(content, { size: modalType == 'viewSnapshot' ? 'lg' : 'xl', backdrop: 'static', centered: true });     
    }
  }

  onSaveCorrectedVehicleData() {
    if(this.selectedEventData.id){
      let inputData = {
        "id": this.selectedEventData.id,
        "vehicleNumber": this.commonUIComponent.rawVehicleNumberFormatte(this.selectedEventData.vehicleNumber),
        "vehicleType": this.selectedEventData.vehicleType,
      }
      this.httpService.post('offlinevi/addorupdatevehicletrackingdetails', { "requestParams" : inputData }).subscribe(
        (response: any) => {
          if(response.success){
            this.vehicleMovementList.forEach((value,key) => {
              if(value.id == this.selectedEventData.id)
              this.vehicleMovementList[key] = response.returnObject;
            });
            this.toastService.success('Vehicle details updated successfully');
            this.selectedEventData = {};
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

  downloadSnapshotreport() {
    let url = '';
    let inputData = {};
    if(this.selectedVideoSources == '' || this.selectedVideoSources == 'All Videos'){
      url = 'downloadvehicletrackingdetailsbetweendatesnapshotreport';
      inputData = {
        "fromDateTime": this.selectedDate.fromDate+":59",
        "toDateTime": this.selectedDate.toDate+":59"
      };
    }else{
      url = 'downloadvehicletrackingdetailsbyvideosourcesnapshotreport';
      inputData = this.selectedVideoSources;
    }
    if(url != ''){
      this.loaderService.sendLoadingText(CommonConstants.loaderMessages.loaderDisplayTextForDownload);
      this.httpService.post('offlinevi/'+ url, { "requestParams": inputData }).subscribe(
        (response: any) => {
          this.loaderService.hide();
          this.loaderService.sendLoadingText('');
          this.downloadDataAsPdfFormat(response);
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }
  }

  downloadDataAsPdfFormat(data: any) {
    var blob = new Blob([data], { type: "application/pdf" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    this.getCurrentDateAndTime();
    a.download = 'Vehicle_tracking_snapshot_report_'+ this.selectedVideoSources +'_'+ this.currentDateandTime.date +'-'+ this.currentDateandTime.time ;
    a.click();
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
    this.addFooters(doc);
    // below line for Open PDF document in new tab
    // doc.output('dataurlnewwindow')

    // below line for Download PDF document  
    this.getCurrentDateAndTime();
    doc.save(this.title+'-'+ this.selectedVideoSources +'_'+ this.currentDateandTime.date +'-'+ this.currentDateandTime.time +'.pdf');
  }

  addFooters(doc: any) {
    const pageCount = doc.internal.getNumberOfPages()
  
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    for (var i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.text('Page ' + String(i) + ' of ' + String(pageCount), doc.internal.pageSize.width / 2, 287, {
        align: 'center'
      })
    }
  }

  openFileUploadModal(content) {
    this.modalService.open(content, { size: 'lg', backdrop: 'static', centered: true });
  }

  uploadVideo(file: File) {
    setTimeout(() => {
      if (file) {
        this.fileName = file.name;
        this.file = file;
        let fileFormat = this.fileName.split('.')[1];
        if(fileFormat != 'mp4' && fileFormat != 'mov' && fileFormat != 'dav'){
          this.toastService.error('Invalid video file.');
          return;
        }
        this.uploadForm.patchValue({
          upload: file
        });
        this.uploadForm.get('upload').updateValueAndValidity()
  
        var formData: any = new FormData();
        formData.append('upload', this.uploadForm.get('upload').value);

        this.loaderService.sendLoadingText(CommonConstants.loaderMessages.loaderDisplayTextForUploadingFile);
        this.httpService.formDataPost('uploadvideo', formData).subscribe(
          (response: any) => {            
            if(response.success){
              let result = JSON.parse(response.returnObject[0]);
              this.loaderService.hide();
              this.loaderService.sendLoadingText('');
              this.modalService.dismissAll();

              if(result.status_code+'' == '200'){
                this.toastService.success('Video uploaded successfully');
                let inputData = {
                  "fromDateTime": this.dateFormater(this.fromDate)+":59",
                  "toDateTime": this.dateFormater(this.toDate)+":59"
                };
                this.httpService.post('offlinevi/getallvideosourcesbetweendateandtime', { "requestParams": inputData }).subscribe(
                  (response: any) => {
                    this.videoSourcesLists = response.returnObject;
                    if(this.videoSourcesLists.length >= 1)
                      this.videoSourcesLists.unshift('All Videos');
                    this.selectedVideoSources = this.fileName;
                    this.getListMovementsByVideoSources();
                    this.loaderService.hide();
                  },
                  (error) => { //error() callback
                    this.httpService.serverErrorMethod(error);
                });                
              }
              else{
                this.toastService.error('Error occured while processing the video. Try again.');
                this.ngOnInit();
              }              
            }            
          },
          (error) => { //error() callback
            this.httpService.serverErrorMethod(error);
        });
      }
    },500);    
  }

}
