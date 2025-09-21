import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { KeycloakService } from '../keycloak/keycloak.service';

@Injectable()
export class HttpTokenInterceptor implements HttpInterceptor {
  constructor(private keycloakService: KeycloakService) {}

intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return from(this.keycloakService.getToken()).pipe(
    mergeMap(token => {
      if (token) {
        const authReq = request.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next.handle(authReq);
      }
      return next.handle(request);
    })
  );
}
}