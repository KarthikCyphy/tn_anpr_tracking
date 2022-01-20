import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbPaginationConfig } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app-core/auth/auth.service';
import { CommonUiService } from 'src/app-core/services/common-ui.service';
import { HttpService } from 'src/app-core/services/http.service';
import { WebsocketService } from 'src/app-core/services/websocket.service';
import { LoaderService } from 'src/app-core/services/loader.service';
import { CommonConstants } from 'src/app-core/constants/common-constants';
import { environment } from 'src/environments/environment';
import * as moment from 'moment';

// import * as _ from 'lodash';
import 'lodash';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import jsPDF from 'jspdf';
declare var _:any;
export interface Message {
  author: string;
  message: string;
}
@Component({
  selector: 'app-upload-video',
  templateUrl: './upload-video.component.html',
  styleUrls: ['./upload-video.component.scss'],
  encapsulation: ViewEncapsulation.None,

})
export class UploadVideoComponent implements OnInit {

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
    public websocketService: WebsocketService,
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

    this.messages = <Subject<Message>>websocketService.connect(environment.webSocketUrl).map(
      (response: MessageEvent): Message => {
        let data = JSON.parse(response.data);
        return {
          author: data.author,
          message: data
        };
      }
    );

    this.messages.subscribe(msg => {
      let data = msg.message;
      if(!this.newDataStared){
        this.clearFilters();
        this.newDataStared = true;
      }
      if(this.router.url == '/app/upload-video'){
        this.toProcessSocketData(data);
      }
    });
  }

  pageSize = CommonConstants.dataTableConstant.pageSize;
  page = CommonConstants.dataTableConstant.page;

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
  socketDataMap: any;
  newDataStared: boolean = false;

  // For download PDF
  title = 'Vehicle Movement List';
  head = [['Vehicle Number', 'Vehicle Type', 'Make', 'Model', 'Color', 'Updated On']];
  data = [];
  currentDateandTime: any = {'date': '', 'time': ''};

  fileName: string = "No file selected";
  file: File;
  uploadForm: FormGroup;
  selectedFiles: FileList;
  selectedFilesMsg: any = [];
  tempArrFiles: any = [];
  proceedFileUpload: boolean = true;
  maxFileErrMsg: string = '';

  dateFormater(date: any) {
    const convertedDate = new Date(date);
    let finalDate = (moment(convertedDate).format('DD-MM-YYYY') + ' ' + moment(convertedDate).format('HH:mm'));
    return finalDate;
  }

  ngOnInit(): void {
    this.today =(moment(new Date()).format('DD-MM-YYYY') + ' ') ;
    this.fromDate = this.today + '00:00:00'; 
    this.toDate = this.today + '23:59:59';  
    this.currentDateandTime.date = this.dateFormater(new Date());

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

  getListMovementsByVideoSources() {
    this.selectedEventData = {};
    if(this.selectedVideoSources != 'All Videos')
      this.getVideoSorceDataFromMap(this.selectedVideoSources);
    else{
      this.videoSourcesLists.forEach((value,key) => {
        if(key == 0)
          this.loaderService.show();
        setTimeout(() => {
          this.getVideoSorceDataFromMap(value);
        },100);
      });
    }
    this.vehicleInfoForm = this.fb.group({     
      vehicleNumber: ['', [Validators.required]],
      vehicleType: ['', [Validators.required]],
    });
  }
  
  getVideoSorceDataFromMap(selectedVideoSources:any){
    this.vehicleMovementList = this.vehicleMovementList.concat(this.socketDataMap.get(selectedVideoSources).listData);
    this.filterTerm = ''; this.page = 1;
    let tempArr =[];
    _.cloneDeep(this.vehicleMovementList).forEach((value,key) => {
      const data = {
        'vehicleNumber': value.vehicleNumber, 
        'vehicleType': value.vehicleType, 
        'make': value.make,
        'model': value.model,
        'color': value.color,
        'updatedOn': value.updatedOn
      }
      tempArr.push(data);
      if(key == this.vehicleMovementList.length -1){
        this.data = this.commonUIComponent.convertDataToDownloadPDF(_.cloneDeep(tempArr));
        this.loaderService.hide();
      }
    });
  }

  toProcessSocketData(data){
    setTimeout(() => {
      if(this.socketDataMap.get(data.videoSource) != undefined){
        let mapObj = this.socketDataMap.get(data.videoSource);
            mapObj.count = mapObj.count + 1;
            mapObj.listData.unshift(_.cloneDeep(data));
        this.socketDataMap.set(data.videoSource,mapObj);
      }
      this.vehicleMovementList.unshift(_.cloneDeep(data));
    },100);
  }

  clearFilters(){
    this.vehicleMovementList = [];
    this.videoSourcesLists = [];  
    this.selectedEventData = {};
    this.socketDataMap = new Map();
    this.selectedFilesMsg.forEach((value,key) => {
      this.videoSourcesLists.push(value.fileName);
      this.socketDataMap.set(value.fileName+'', {'fileName':value.fileName,'count': 0,'listData':[]});
      if(this.videoSourcesLists.length >= 1 && this.selectedFilesMsg.length == key +1)
        this.videoSourcesLists.unshift('All Videos');
    });
    this.filterTerm = ''; this.page = 1;
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
    let url = 'downloadvehicletrackingdetailsbyvideosourcesnapshotreport';
    let inputData = this.selectedVideoSources;
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
    a.download = 'Vehicle_tracking_snapshot_report_'+ this.selectedVideoSources.split('.')[0] +'_'+ this.currentDateandTime.date +'-'+ this.currentDateandTime.time ;
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
    this.modalService.open(content, { size: 'xl', backdrop: 'static', centered: true });
    this.selectedFilesMsg = [];
    this.proceedFileUpload = true;
  }

  selectFiles(event) {
    this.selectedFiles = event.target.files;
    // this.selectedFilesMsg = [];
    this.maxFileErrMsg = '';
    this.proceedFileUpload = true;
    for (let i = 0; i < CommonConstants.uploadFile.MaxSize; i++) {
      let file = this.selectedFiles[i];
      if(this.selectedFiles.length > CommonConstants.uploadFile.MaxSize)
        this.maxFileErrMsg = CommonConstants.uploadFile.maxFileErrMsg;

      if (this.selectedFiles[i]) {
        if(this.selectedFilesMsg.length < CommonConstants.uploadFile.MaxSize) {
          this.fileName = file.name;
          this.file = file;
          let inputObj = {'fileName':this.fileName, 'file': this.selectedFiles[i],'fileSize': '', 'loaderStatus':'pending','errMsg':[]};

          var sizeInMB = (this.file.size / (1024*1024)).toFixed(2);
          inputObj.fileSize = sizeInMB;
          let fileFormat = this.fileName.split('.')[1];
          if(fileFormat != 'mp4' && fileFormat != 'mov' && fileFormat != 'dav'){
            this.proceedFileUpload = false;
            inputObj.errMsg.push('Invalid file format.');
          }
          // if(parseFloat(sizeInMB) >= 500){
          //   this.proceedFileUpload = false;
          //   if(inputObj.errMsg.length == 0)
          //     inputObj.errMsg.push('File size limit exceeded.');
          // }
          this.selectedFilesMsg.push(inputObj);
        }
        else
          this.maxFileErrMsg = CommonConstants.uploadFile.maxFileErrMsg;
      }      
    }
    setTimeout(() => {
      this.selectedFilesMsg = this.selectedFilesMsg.filter((v,i,a)=>a.findIndex(t=>(t.fileName===v.fileName))===i);
      this.tempArrFiles = _.cloneDeep(this.selectedFilesMsg);
    },25);
  }

  removeSelectedFiles(index:any){
    this.selectedFilesMsg.splice(index,1);
    this.tempArrFiles = _.cloneDeep(this.selectedFilesMsg);
    this.maxFileErrMsg = '';
    this.proceedFileUpload = true;
    if(this.tempArrFiles.length > CommonConstants.uploadFile.MaxSize)
      this.maxFileErrMsg = CommonConstants.uploadFile.maxFileErrMsg;
  };

  uploadVideo() {
    if(this.tempArrFiles.length == this.selectedFilesMsg.length)
      this.newDataStared = false;
    setTimeout(() => {
      if(this.tempArrFiles.length != 0){        
        this.fileName = this.tempArrFiles[0].file.name;
        this.file = this.tempArrFiles[0].file;        
        this.uploadForm.patchValue({
          upload: this.tempArrFiles[0].file
        });
        this.uploadForm.get('upload').updateValueAndValidity()
  
        var formData: any = new FormData();
        formData.append('upload', this.uploadForm.get('upload').value);

        this.selectedFilesMsg[this.selectedFilesMsg.length - this.tempArrFiles.length]['loaderStatus'] = 'started';
        this.loaderService.sendLoadingText(CommonConstants.loaderMessages.loaderDisplayTextForUploadingFile);
        this.loaderService.show(); 
        this.vehicleMovementList = [];
        const url = environment.ANPRRestUrl;
        var headers = {};
        
        fetch(url, {
            method : "POST",
            mode: 'cors',
            headers: headers,
            body: formData
        })
        .then((response) => {
            if (response.ok) {
              this.selectedFilesMsg[this.selectedFilesMsg.length - this.tempArrFiles.length]['loaderStatus'] = response.status+'' == '200' ? 'completed' : 'error';
              this.tempArrFiles.shift();
            }
            return response.json();
        })
        .then(data => {          
          if(!this.commonUIComponent.isEmptyObject(data) && this.tempArrFiles.length == 0){
            this.loaderService.hide();
            this.loaderService.sendLoadingText('');
            // this.modalService.dismissAll();

            if(data.status_code+'' == '200'){
              this.toastService.success('Video uploaded successfully');
              if(this.selectedFilesMsg.length >= 1)
                this.selectedVideoSources = this.fileName;
              else
                this.selectedVideoSources = 'All Videos';
              
              this.getListMovementsByVideoSources();               
            }
            else{
              this.toastService.error('Error occured while processing the video. Try again.');
              if(this.tempArrFiles.length == 0)
                this.ngOnInit();
              else{
                this.uploadVideo();
              }
            }              
          }else
            this.uploadVideo();     
        })
        .catch(function(error) {
          console.log(error)
        });
      }
    },100);    
  }
}
