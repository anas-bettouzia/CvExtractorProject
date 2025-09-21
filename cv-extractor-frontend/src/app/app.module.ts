import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CvModule } from './cv/cv.module';

// ng-bootstrap
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { KeycloakService } from './keycloak/keycloak.service';
import { HeaderComponent } from './cv/components/header/header.component';

export function kcFactory(kcService: KeycloakService) {
  return () => kcService.init();
} 

@NgModule({
  declarations: [AppComponent, HeaderComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    NgbModule,
    CvModule,
    AppRoutingModule,
  ],
  providers: [
     {
      provide: APP_INITIALIZER,
      deps: [KeycloakService],
      useFactory: kcFactory,
      multi: true,
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
