import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { MealItem } from '../energy/energy';
import { FoodsService } from '../energy/foods.service';
import { FavoriteService } from './favorite.service';
import { MealAiService } from './meal-ai.service';
import { MealLogPage } from './meal-log.page';
import { MealService } from './meal.service';
import { ProfileService } from '../energy/profile.service';
import { SpeechService } from './speech';
import { Supabase } from '../../core/supabase';

const item = (name: string, qty = 1): MealItem => ({ name, kcal: 100, qty });

function setup() {
  const stub = {
    [ProfileService.name]: { changes: signal(0) },
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: MealService, useValue: {} },
      { provide: Supabase, useValue: {} },
      { provide: ToastController, useValue: { create: async () => ({ present: () => undefined }) } },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: ProfileService, useValue: stub[ProfileService.name] },
      { provide: FavoriteService, useValue: {} },
      { provide: FoodsService, useValue: { catalog: signal([]) } },
      { provide: MealAiService, useValue: {} },
      { provide: SpeechService, useValue: { supported: false, listening: signal(false) } },
    ],
  });
  return TestBed.runInInjectionContext(() => new MealLogPage());
}

describe('MealLogPage: porciones por fila', () => {
  it('cambiar la porción de una fila no toca las demás', () => {
    const page = setup();
    page.draftItems.set([item('Arepa'), item('Queso'), item('Café'), item('Pan')]);

    page.setQty(1, 0.5);
    page.setQty(3, 2);

    expect(page.draftItems().map((i) => i.qty)).toEqual([1, 0.5, 1, 2]);
    page.setQty(1, 1.5);
    expect(page.draftItems().map((i) => i.qty)).toEqual([1, 1.5, 1, 2]);
  });

  it('+1 suma a la fila elegida y quitar una fila deja el resto intacto', () => {
    const page = setup();
    page.draftItems.set([item('Arepa'), item('Queso', 2), item('Café')]);

    page.changeQty(0, 1);
    expect(page.draftItems().map((i) => i.qty)).toEqual([2, 2, 1]);

    page.removeItem(1);
    expect(page.draftItems().map((i) => i.name)).toEqual(['Arepa', 'Café']);
    expect(page.draftItems().map((i) => i.qty)).toEqual([2, 1]);
  });
});
