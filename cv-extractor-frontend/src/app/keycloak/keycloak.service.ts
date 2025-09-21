import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { UserProfile } from './user-profile';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private _keycloak: Keycloak | undefined;
  private _profile: UserProfile | undefined;


  constructor() { }

    get profile(): UserProfile | undefined {
    return this._profile;
  }

    get keycloak() {
    if (!this._keycloak) {
      this._keycloak = new Keycloak({
        url: 'http://localhost:8180', // L'URL de votre serveur Keycloak
        realm: 'cv-extract-login', // Le nom de votre realm
        clientId: 'cv-extract', // L'ID de votre client dans Keycloak
      });
    }
    return this._keycloak;
  }
  getToken(): Promise<string> {
    const token = this.keycloak.token;
    if (token) {
      return Promise.resolve(token);
    } else {
      return Promise.reject('Token is undefined');
    }
  }
  async init() {
    const authenticated = await this.keycloak.init({
      onLoad: 'check-sso', // force le login si pas authentifié ( ou login-required)
      silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
    });

    if (authenticated) {
      this._profile = await this.keycloak.loadUserProfile();
      this._profile.token = this.keycloak.token || '';
    }
  }

  login() {
    return this.keycloak.login();
  }
  hasRole(role: string): boolean {
    return (
      this.keycloak.tokenParsed?.realm_access?.roles.includes(role) || false
    );
  }

  isAuthenticated(): boolean {
    return this.keycloak.authenticated || false;
  }

  logout() {
    // this.keycloak.accountManagement();
    return this.keycloak.logout({ redirectUri: 'http://localhost:4200' });
  }

  goToAccountManagement() {
    this.keycloak.accountManagement();
  }
}
