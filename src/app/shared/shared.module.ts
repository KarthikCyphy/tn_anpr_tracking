import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoaderComponent } from './components/loader/loader.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ContentLayoutComponent } from './components/layout/content-layout/content-layout.component';
import { FeatherIconsComponent } from './components/feather-icons/feather-icons.component';
import { CustomizerComponent } from './components/customizer/customizer.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UtilsModule } from 'src/app-core/utils.module';
import 'hammerjs';
import 'mousetrap';

// services
import { NavService } from "./services/nav.service";
import { CustomizerService } from "./services/customizer.service";
// import { HttpService } from "./services/http.service";
// import { WebsocketService } from "./services/websocket.service";
// import { CommonUiService } from './services/common-ui.service';
// Directives
import { ToggleFullscreenDirective } from "./directives/fullscreen.directive";

@NgModule({
  declarations: [
    LoaderComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    ContentLayoutComponent,
    FeatherIconsComponent,
    ToggleFullscreenDirective,
    CustomizerComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NgbModule,
    UtilsModule,
  ],
  exports: [
    LoaderComponent,
    FeatherIconsComponent,
    UtilsModule
  ],
  providers: [
    NavService,
    CustomizerService,
    // HttpService,
    // WebsocketService,
    // CommonUiService
  ]
})
export class SharedModule { 
  static forRoot(): ModuleWithProviders<SharedModule> {
    return {
        ngModule: SharedModule,
        providers: [
        ]
    };
}
}

