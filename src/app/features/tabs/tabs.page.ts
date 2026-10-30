import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barbellOutline, restaurantOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="comidas">
          <ion-icon name="restaurant-outline" />
          <ion-label>Comidas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="actividad">
          <ion-icon name="barbell-outline" />
          <ion-label>Actividad</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  constructor() {
    addIcons({ restaurantOutline, barbellOutline });
  }
}
