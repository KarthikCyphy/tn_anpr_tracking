import { ChangeDetectionStrategy, Component, Injectable, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbCalendar, NgbDate, NgbDateStruct, NgbModal, NgbPaginationConfig, NgbTabChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app-core/auth/auth.service';
import { HttpService } from 'src/app-core/services/http.service';
import { WebsocketService } from 'src/app-core/services/websocket.service';
import { CommonUiService } from 'src/app-core/services/common-ui.service';
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs/Rx";
import { environment } from 'src/environments/environment';
import { NavService } from '../shared/services/nav.service';
import { LoaderService } from 'src/app-core/services/loader.service';
import jsPDF from 'jspdf';
// import * as _ from 'lodash';
import 'lodash';
declare var _:any;

// @Injectable()
export interface Message {
  author: string;
  message: string;
}

export interface Menu {
	path?: string;
	title?: string;
	icon?: string;
	type?: string;
	badgeType?: string;
	badgeValue?: string;
	active?: boolean;
	bookmark?: boolean;
	children?: Menu[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,  
  changeDetection: ChangeDetectionStrategy.Default,
  providers: [NgbPaginationConfig] // add NgbPaginationConfig to the component providers
})


export class DashboardComponent implements OnInit, OnDestroy {
  
  componentSubscriptions: Subscription = new Subscription();
  public messages: Subject<Message>;

  @ViewChild('vehicleSearchListContenet') templateRef: TemplateRef<any>;

  MENUITEMS: Menu[];
  
  constructor(
    private router: Router,
    private httpService : HttpService,
    private toastService: ToastrService,
    public authService: AuthService,
    public websocketService: WebsocketService,
    private commonUIComponent: CommonUiService,
    private modalService: NgbModal,
    private navService: NavService,    
    private fb: FormBuilder,
    private loaderService: LoaderService,    
    config: NgbPaginationConfig,
    private calendar: NgbCalendar,

  ) { 

    this.MENUITEMS = [
      {
        path: '/app/dashboard', title: 'Dashboard', type: 'link', icon: 'home', active: false, 
      },
      {
        path: '/app/home', title: 'Home', type: 'link', icon: 'home', active: false, 
      },
      {
        path: '/app/gate', title: 'Gates', type: 'link', icon: 'airplay', active: true,
      },
      {
        path: '/app/light', title: 'Light Controllers', type: 'link', icon: 'zap', active: false, 
      },
      {
        path: '/app/camera', title: 'Cameras', type: 'link', icon: 'camera', active: false, 
      },
      {
        path: '/app/vehicles', title: 'Vehicles', type: 'link', icon: 'truck', active: false, 
      },		
      // {
      //   path: '/app/reports', title: 'Reports', type: 'link', icon: 'bar-chart-2', active: false,
      // },
    ]
    navService.items = new BehaviorSubject<Menu[]>(this.MENUITEMS);

    if(authService.userData.roles[0] == 'Admin'){
      this.toastService.error('Unauthorised page access.');
      authService.forceLogout();
    }

    config.size = 'sm';
    config.boundaryLinks = true;

    this.today = calendar.getToday();
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 0);

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
      if(this.authService.userData.roles[0] == 'Operator' && this.router.url == '/app/dashboard'){
        this.toProcessSocketDataToDashboard(data, 'add');
        console.log(data)
      }
    });
  }

  dashboardDataList: any = [];
  selectedEventData: any = {};
  vehicleInfoForm: FormGroup;
  vehicleVerifyData: any = {"vvHistoryIdPk":'', "remarks":"", 'lightIp': "", "lightPort": ""};
  gateMapObject = new Map();
  
  vehiclesListData: any = [];

  pageSize = 10;
  page = 1;
  showDatepicker: boolean = false;
  date: { year: number, month: number, time: number };
  hoveredDate: NgbDate;
  today: NgbDate;
  fromDate: NgbDate;
  toDate: NgbDate;
  selectedDate: any = {};
  selectedTypeofList: string;

  vehicleMovementList: any = [];
  selectedVehicleInfo: any = {};
  vehiclesMovementFilterTerm: string;
  eventFilterTerms: string;

  showGateEventDataLimited: boolean = true;

  // For download PDF
  title = 'Vehicle List';
  head = [['S.NO', 'Vehicle Number', 'Owner Name', 'Address', 'Type', 'Category', 'Listing Type']];
  data = [];
  currentDateandTime: any = {'date': '', 'time': ''};

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }

    if(this.fromDate != null && this.toDate != null){
      this.showDatepicker = false;
      this.getListMovements('byDate');
    }
  }

  isHovered(date: NgbDate) {
    return this.fromDate && !this.toDate && this.hoveredDate && date.after(this.fromDate) && date.before(this.hoveredDate);
  }

  isInside(date: NgbDate) {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return date.equals(this.fromDate) || date.equals(this.toDate) || this.isInside(date) || this.isHovered(date);
  }

  dateFormater(event:any) {
    let year = event.year;
    let month = event.month <= 9 ? '0' + event.month : event.month;
    let day = event.day <= 9 ? '0' + event.day : event.day;
    let finalDate = day + "-" + month + "-" + year;
    return finalDate;
  }

  onClickTypeChange(type: string) {
    this.vehicleMovementList = [];
    this.selectedDate = {};
    if(type == 'todays')
      this.getListMovements(type);
    else
      this.fromDate = null; this.toDate = null;
  }

  ngOnInit() {
    this.httpService.post('vvadmin/getallcameras', {"requestParams" : {}}).subscribe(
      (response: any) => {
        this.loaderService.hide();
        this.dashboardDataList = [];
        this.gateMapObject = new Map();
        setTimeout(() => {          
          let result = response.returnObject;
          result.forEach((value,key) => {
            this.dashboardDataList.push(
              {
                'gateName': value.gateName,
                'gateType': value.gateVerificationType,
                'gateId': value.gateId,
                'cameraId': value.cameraId,
                'cameraIp': value.cameraIp,
                'lightIp': value.lightIp,
                'lightPort': value.lightPort,
                'viewType': this.showGateEventDataLimited,
                'vehiclesData': []
              }
            );
            const inputData = {
              "gateId": value.gateId,
              "fromDateTime": this.dateFormater(this.today) + " 00:00:00",
              "toDateTime": this.dateFormater(this.today) + " 23:59:59",
              "limit":10
            }
            this.httpService.post('vvadmin/getvehiclemovmentdetailsbygatebetweendateandtime', {"requestParams" : inputData}).subscribe(
              (response: any) => {
                // if(response.success){
                  setTimeout(() => {
                    this.loaderService.hide();
                    this.gateMapObject.set(inputData.gateId+'', response.returnObject); 
                    this.assignMovmentdetailstogate(this.showGateEventDataLimited,inputData.gateId);
                  }, 10);                
                // }
              },
              (error) => { //error() callback
                this.httpService.serverErrorMethod(error);
            });          
          });
        }, 10);
        
        // this.toProcessSocketDataToDashboard({"id":2356,"gate":{"id":5,"gateName":"Gate-1","vehicleVerificationType":"MANUAL"},"vehicleNumber":"ka45aj7450","vehicleType":"SEDAN","imagePath" : "camera-1_screenshots\\21-09-20\\12-04-38.502821.jpg","vehicleEntryStatus":"WAITING_FOR_MANUAL_VERFICATION","vehicleEntryTime":"10:54:10","vehicleEntryDate":"22-09-2021","vehicleListingType":"WHITE_LISTED"},'add');
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });

    this.vehicleInfoForm = this.fb.group({
      gateName: [''],
      vehicleVerificationType: [''],
      vehicleListingType: [''],
      vehicleNumber: ['', [Validators.required]],
      vehicleType: ['', [Validators.required]],
      vehicleEntryTime: [''],
      vehicleEntryDate: [''],
      vehicleEntryStatus: [''],
      remarks: [''],
    });

    this.componentSubscriptions.add(this.commonUIComponent.getSideNavToggleValue.subscribe((data: any) => {
      if (!this.commonUIComponent.isEmptyObject(data)) {
        this.vehiclesListData = data.returnObject;
        this.modalService.open(this.templateRef, { size: 'xl', backdrop: 'static', centered: true });
      }
    }));

    // this.currentDateandTime.date = this.dateFormater(this.today);
  }

  assignMovmentdetailstogate(type: boolean, gateId:string){
    this.eventFilterTerms = '';
    this.dashboardDataList.forEach((value,key) => {
      if(value.gateId == gateId){
        this.dashboardDataList[key].viewType = type;
        this.dashboardDataList[key].vehiclesData = this.gateMapObject.get(value.gateId+'');
        this.getCountData(key, this.dashboardDataList[key].vehiclesData);
      }        
    });
  }

  toProcessSocketDataToDashboard(socketData: any, type:string){
    // console.log(socketData)
    this.dashboardDataList.forEach((value,key) => {
      if(value.gateId === socketData.gate.id){
        if(type == 'update' && this.dashboardDataList[key]['vehiclesData'].length){
          this.dashboardDataList[key].vehiclesData.forEach((values,index) => {
            if(values.id === socketData.id){
              this.dashboardDataList[key].vehiclesData[index] = socketData;
            }
          });
        }else{
          let signalName = socketData.vehicleListingType == 'NONE' ? 'yellow' : socketData.vehicleListingType == 'WHITE_LISTED' ? 'green': 'red';
          this.triggerLightAPI(value.lightIp, value.lightPort, signalName);
          this.dashboardDataList[key].vehiclesData.unshift(socketData);
          if(this.dashboardDataList[key].viewType)        
            this.dashboardDataList[key].vehiclesData = this.arrayLimit(this.dashboardDataList[key].vehiclesData);
          else
            this.dashboardDataList[key].vehiclesData = this.dashboardDataList[key].vehiclesData;
          
          this.getCountData(key, this.dashboardDataList[key].vehiclesData);
        }
      }
    });
  }

  getCountData(index: number, vehiclesData: any){
    let white = 0;
    let black = 0;
    let none = 0;
    vehiclesData.forEach((value,key) => {
      switch(value.vehicleListingType){
        case 'WHITE_LISTED':
          white = white + 1;
          break;
        case 'BLACK_LISTED':
          black = black + 1;
          break;
        case 'NONE':
          none = none + 1;
          break;
      }
      if(vehiclesData.length-1 == key){
        this.dashboardDataList[index]['whiteListCount'] = white;
        this.dashboardDataList[index]['blackListCount'] = black;
        this.dashboardDataList[index]['noneCount'] = none;
      }
    });
  }

  triggerLightAPI(lightIp: string, lightPort: string, signalName: string) {
    let inputData = {
      "ipaddress" : lightIp,
      "port": lightPort,
      "signalName": signalName
    }
    this.httpService.post('vvlightcontroller/sendsignalon', { "requestParams": inputData }).subscribe(
      (response: any) => {
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });    
  }

  // clearAllLight(inputData: any, signalName:string){
  //   let colorList = ['yellow', 'red', 'green'];
  //   inputData = _.cloneDeep(inputData);
  //   colorList.forEach((value,key) => {
  //     inputData.signalName = value;
  //     this.httpService.post('vvlightcontroller/sendsignaloff', { "requestParams": inputData }).subscribe(
  //       (response: any) => {
  //         if (response.success) {
  //           if(key == colorList.length -1){
  //             setTimeout(() => {
  //             inputData.signalName = signalName;
  //               this.httpService.post('vvlightcontroller/sendsignalon', { "requestParams": inputData }).subscribe(
  //                 (response: any) => {
  //                   this.loaderService.hide();
  //                 },
  //                 (error) => { //error() callback
  //                   this.httpService.serverErrorMethod(error);
  //               });
  //             }, 200);
  //           }
  //         }
  //         this.loaderService.hide();
  //       },
  //       (error) => { //error() callback
  //         this.httpService.serverErrorMethod(error);
  //     });
  //   });
  // }

  openVehicleVerifyModal(content, id: string, verifyType: string, lightIp: string, lightPort: string) {
    this.modalService.open(content, { backdrop: 'static', centered: true });
    this.vehicleVerifyData.vvHistoryIdPk = id;
    this.vehicleVerifyData.verifyType = verifyType;
    this.vehicleVerifyData.lightIp = lightIp;
    this.vehicleVerifyData.lightPort = lightPort;
  }

  onVehicleVerifyStatusSubmit() {
    if (this.vehicleVerifyData.vvHistoryIdPk) {
      let url = this.vehicleVerifyData.verifyType == 'notallowed' ? 'updatevehiclentrystatustonotallowed' : 'updatevehiclentrystatustoallowed';
      this.httpService.post('vvadmin/' + url, { "requestParams": this.vehicleVerifyData }).subscribe(
        (response: any) => {
          if (response.success) {
            this.toastService.success('Vehicle entry status updated successfully');
            this.toProcessSocketDataToDashboard(response.returnObject, 'update');
            this.modalService.dismissAll();
            let signalName = this.vehicleVerifyData.verifyType == 'notallowed' ? 'red' : 'green';
            this.triggerLightAPI(this.vehicleVerifyData.lightIp, this.vehicleVerifyData.lightPort, signalName);
            
          }
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }
  }

  openViewDetailsModal(content, rowClickedid: string, modalType) {
    if(rowClickedid){      
      this.httpService.post('vvadmin/getverificationdetails', {"requestParams" : rowClickedid}).subscribe(
        (response: any) => {
          this.selectedEventData = response.returnObject;
          this.selectedEventData.vehicleNumber = this.commonUIComponent.vehicleNumberFormatter(this.selectedEventData.vehicleNumber);
          this.selectedEventData.vehicleListingType = this.commonUIComponent.removeUnderscores(this.selectedEventData.vehicleListingType);
          this.modalService.open(content, { size: modalType == 'viewSnapshot' ? 'lg' : 'xl', backdrop: 'static', centered: true });
          this.loaderService.hide();

          this.httpService.post('irakshan/fetchimage', {"requestParams" : { 'imageFilePath': this.selectedEventData.imagePath }}).subscribe(
            (response: any) => {
              this.selectedEventData.imagePath = response.returnObject;
              this.loaderService.hide();
            },
            (error) => { //error() callback
              this.httpService.serverErrorMethod(error);
          }); 
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });         
    }
  }

  onSaveCorrectedVehicleData() {
    if(this.selectedEventData.id){
      let inputData = {
        "id": this.selectedEventData.id,
        "vehicleNumber": this.commonUIComponent.rawVehicleNumberFormatte(this.selectedEventData.vehicleNumber),
        "vehicleType": this.selectedEventData.vehicleType
      }
      this.httpService.post('vvadmin/addorupdateverificationentry', { "requestParams" : inputData }).subscribe(
        (response: any) => {
          if(response.success){
            this.toastService.success('Vehicle details updated successfully');
            this.toProcessSocketDataToDashboard(response.returnObject, 'update');
            this.modalService.dismissAll();
          }
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }
  }

  onVehicleMovement(content, vehicleNumber: string, vehicleType: string) {
    this.selectedTypeofList = 'todays';    
    this.selectedVehicleInfo = { 'vehicleNumber' : vehicleNumber, 'vehicleType': vehicleType   };    
    this.modalService.open(content, { size: 'xl', backdrop: 'static', centered: true });
    this.getListMovements(this.selectedTypeofList);
  }  

  getListMovements(type: string) {
    if(type == 'todays'){
      this.fromDate = null; this.toDate = null;
      this.httpService.post('vvadmin/getvehiclemovmentdetailsforvehiclenumber', { "requestParams": this.commonUIComponent.rawVehicleNumberFormatte(this.selectedVehicleInfo.vehicleNumber) }).subscribe(
        (response: any) => {
          this.vehicleMovementList = response.returnObject;        
          this.loaderService.hide();
        },
        (error) => { //error() callback
          this.httpService.serverErrorMethod(error);
      });
    }else{
      if(this.fromDate != null && this.toDate != null){
        this.selectedDate = {};
        const inputData = {
          "vehicleNumber": this.commonUIComponent.rawVehicleNumberFormatte(this.selectedVehicleInfo.vehicleNumber),
          "fromDateTime": this.dateFormater(this.fromDate) + " 00:00:00",
          "toDateTime": this.dateFormater(this.toDate) + " 23:59:59"
        };
        this.selectedDate = { 'fromDate': this.dateFormater(this.fromDate), "toDate": this.dateFormater(this.toDate)  };
        this.httpService.post('vvadmin/getvehiclemovmentdetailsforvehiclenumberbetweendates', { "requestParams": inputData }).subscribe(
          (response: any) => {
            this.vehicleMovementList = response.returnObject;        
            this.loaderService.hide();
          },
          (error) => { //error() callback
            this.httpService.serverErrorMethod(error);
        });
      }
    }
  }

  openSnapshotModal(content, imagePath: string) {
    this.httpService.post('irakshan/fetchimage', {"requestParams" : { 'imageFilePath': imagePath }}).subscribe(
      (response: any) => {
        this.modalService.open(content, { size: 'lg', backdrop: 'static', centered: true });
        this.selectedVehicleInfo.imagePath = response.returnObject;
        this.loaderService.hide();
      },
      (error) => { //error() callback
        this.httpService.serverErrorMethod(error);
    });
  }

  openShowMoreMovementModal(gateId: string, type: boolean) {
    this.showGateEventDataLimited = !this.showGateEventDataLimited;
    const inputData = {
      "gateId": gateId,
      "fromDateTime": this.dateFormater(this.today) + " 00:00:00",
      "toDateTime": this.dateFormater(this.today) + " 23:59:59",
    }
    if(this.showGateEventDataLimited)
      inputData['limit'] = 10;

    this.httpService.post('vvadmin/getvehiclemovmentdetailsbygatebetweendateandtime', {"requestParams" : inputData}).subscribe(
      (response: any) => {
        this.loaderService.hide();
        this.gateMapObject.set(inputData.gateId+'', response.returnObject); 
        this.assignMovmentdetailstogate(this.showGateEventDataLimited, inputData.gateId);
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
    doc.save(this.title +'.pdf');
  }

  arrayLimit(arr: []){
    let maxNumber = 10;
    if(arr.length > maxNumber){
      arr.splice( -1, arr.length);
    }
    return arr;
  }

  ngOnDestroy(): void {
    this.componentSubscriptions.unsubscribe();
  }
}
