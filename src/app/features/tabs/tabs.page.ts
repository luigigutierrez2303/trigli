import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, flaskOutline, homeOutline, restaurantOutline, walkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="resumen">
          <ion-icon name="home-outline" />
          <ion-label>Resumen</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="comidas">
          <ion-icon name="restaurant-outline" />
          <ion-label>Comidas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="actividad">
          <ion-icon name="walk-outline" />
          <ion-label>Actividad</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="fuerza">
          <ion-icon name="barbell-outline" />
          <ion-label>Fuerza</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="laboratorio">
          <ion-icon name="flask-outline" />
          <ion-label>Lab</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, restaurantOutline, walkOutline, barbellOutline, flaskOutline });
  }
}
