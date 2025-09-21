import { Component } from '@angular/core';
import { KeycloakService } from 'src/app/keycloak/keycloak.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'] // Correction: utiliser .scss si le fichier CSS n'existe pas
})
export class HeaderComponent {
  title = 'cv-extractor-frontend';
  constructor(
    private keycloakService: KeycloakService,
  ) { }
goToLogin() {
this.keycloakService.login();
}
isUserAuthenticated(): boolean {
  return this.isAuthenticated() && this.keycloakService.hasRole('user');
}

isAdminAuthenticated(): boolean {
  return this.isAuthenticated() && this.keycloakService.hasRole('admin');
}

isAuthenticated(): boolean {
  return this.keycloakService.isAuthenticated();
}
goToProfile() {
throw new Error('Method not implemented.');
}
logout() {
this.keycloakService.logout();
}
login(){
  this.keycloakService.login();
}
goToAccountManagement() {
  this.keycloakService.goToAccountManagement();
}
}