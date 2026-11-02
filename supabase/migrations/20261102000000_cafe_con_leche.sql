-- El café con leche (con edulcorante o sin nada) cuenta como bebida sin azúcar; la versión con azúcar es aparte.
update food set portion = '1 taza, sin azúcar', flag = 'unsweetened' where name = 'Café con leche';
update food set portion = '1 taza, sin azúcar', flag = 'unsweetened' where name = 'Café con leche venezolano (marrón)';
insert into food (name, cat, portion, kcal, protein, grams, flag) values
  ('Café con leche con azúcar', 'Bebidas', '1 taza', 100, 3, null, 'sugar')
on conflict (name) do nothing;
