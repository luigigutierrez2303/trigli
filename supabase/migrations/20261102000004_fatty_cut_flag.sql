-- Bondiola y costillitas de cerdo son carne grasa, pero no parrilla: pasan de "Asado / achuras" (-2) a una marca más suave (-1).
update food set flag = 'fattyCut' where name in ('Bondiola de cerdo', 'Costillitas de cerdo');
