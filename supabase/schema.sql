-- ASLAN FAST FOOD · esquema de base de datos
-- Pégalo completo en Supabase > SQL Editor > Run

create table products (
  id text primary key,
  name text not null,
  description text default '',
  price int not null,
  options text[],                       -- p. ej. tipos de carne
  allow_extras boolean default true,
  available boolean default true,
  sort int default 0,
  image_url text
);
create table extras (
  id text primary key,
  name text not null,
  price int not null,
  available boolean default true
);
create table mesas (n int primary key, occupied boolean default false);
create table orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_name text not null,
  tipo text not null check (tipo in ('Domicilio','Retiro','Mesa')),
  address text,
  mesa int,
  pago text not null check (pago in ('Efectivo','Nequi','Daviplata')),
  items jsonb not null,
  total int not null,
  status text not null default 'NUEVO'
    check (status in ('NUEVO','EN_COCINA','LISTO','DESPACHADO','CANCELADO')),
  created_at timestamptz default now()
);

-- Seguridad: el público solo LEE el menú; los pedidos solo se crean/consultan por funciones.
alter table products enable row level security;
alter table extras   enable row level security;
alter table mesas    enable row level security;
alter table orders   enable row level security;

create policy "menu publico"   on products for select using (true);
create policy "extras publico" on extras   for select using (true);
create policy "mesas publico"  on mesas    for select using (true);
create policy "personal productos" on products for all to authenticated using (true) with check (true);
create policy "personal extras"    on extras   for all to authenticated using (true) with check (true);
create policy "personal mesas"     on mesas    for all to authenticated using (true) with check (true);
create policy "personal pedidos"   on orders   for all to authenticated using (true) with check (true);

-- Crear pedido: el precio se calcula AQUÍ (el cliente no puede alterarlo).
create or replace function create_order(
  p_name text, p_tipo text, p_address text, p_mesa int, p_pago text, p_items jsonb
) returns table(order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; pr products%rowtype; ex text; ep int; en text;
  lines jsonb := '[]'::jsonb; t int := 0; unit int; q int; exn text[];
begin
  if length(trim(coalesce(p_name,''))) = 0 then raise exception 'Falta el nombre'; end if;
  if p_tipo = 'Domicilio' and length(trim(coalesce(p_address,''))) = 0 then raise exception 'Falta la dirección'; end if;
  if p_tipo = 'Mesa' and not exists (select 1 from mesas where n = p_mesa) then raise exception 'Mesa inválida'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Pedido vacío'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from products where id = it->>'product_id' and available;
    if not found then raise exception 'Producto no disponible'; end if;
    q := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    unit := pr.price; exn := '{}';
    for ex in select jsonb_array_elements_text(coalesce(it->'extras','[]'::jsonb)) loop
      select e.price, e.name into ep, en from extras e where e.id = ex and e.available;
      if not found then raise exception 'Adición no disponible'; end if;
      unit := unit + ep; exn := exn || en;
    end loop;
    lines := lines || jsonb_build_object('name', pr.name, 'carne', it->>'carne',
                                         'extras', to_jsonb(exn), 'qty', q, 'unit', unit);
    t := t + unit * q;
  end loop;

  insert into orders(customer_name, tipo, address, mesa, pago, items, total)
  values (trim(p_name), p_tipo, p_address, p_mesa, p_pago, lines, t)
  returning id, number into order_id, order_number;

  if p_tipo = 'Mesa' then update mesas set occupied = true where n = p_mesa; end if;
  return next;
end $$;

-- El cliente consulta SOLO su pedido (el id es un UUID imposible de adivinar).
create or replace function get_order(p_id uuid)
returns table(number bigint, status text, tipo text, total int, items jsonb)
language sql security definer set search_path = public as $$
  select number, status, tipo, total, items from orders where id = p_id
$$;

-- El cliente puede cancelar solo mientras cocina no lo haya aceptado.
create or replace function cancel_order(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare m int; tp text;
begin
  update orders set status = 'CANCELADO' where id = p_id and status = 'NUEVO'
  returning mesa, tipo into m, tp;
  if not found then return false; end if;
  if tp = 'Mesa' then update mesas set occupied = false where n = m; end if;
  return true;
end $$;

grant execute on function create_order(text,text,text,int,text,jsonb) to anon, authenticated;
grant execute on function get_order(uuid)    to anon, authenticated;
grant execute on function cancel_order(uuid) to anon, authenticated;

-- Tiempo real (solo el personal autenticado recibe los pedidos)
alter publication supabase_realtime add table orders, mesas, products;

-- Datos iniciales (ajusta precios y descripciones reales)
insert into products (id,name,description,price,options,allow_extras,sort) values
 ('sencilla','Sencilla','Papas francesas, salchicha tradicional y queso',13000,null,true,1),
 ('sencilla-grat','Sencilla gratinada','Papas francesas, salchicha tradicional y queso gratinado',23000,null,true,2),
 ('salchipapa-mixta','Salchipapa mixta','Papas francesas, salchicha tradicional, butifarra y más',25000,null,true,3),
 ('perro-gemelo','Perro gemelo','Doble salchicha, queso costeño, lechuga y más',11000,null,true,4),
 ('perro-suizo','Perro suizo','Salchicha suiza, queso costeño, lechuga y más',16000,null,true,5),
 ('hamburguesa','Hamburguesa Aslan','Carne, tocineta, queso fundido y lechuga, con papas',18000,array['Res','Pollo','Cerdo'],true,6),
 ('burger-alitas','Burger + alitas BBQ','Hamburguesa con queso, alitas BBQ y papas gratinadas',32000,array['Res','Pollo'],true,7),
 ('corona','La Corona (para compartir)','Bandeja grande: papa, ensalada, queso, maíz y salchichón en tiras',45000,array['Salchichón','Mixta'],true,8),
 ('gaseosa','Gaseosa','Personal 400 ml',4000,null,false,9);
insert into extras (id,name,price) values
 ('gratinado','Gratinado',3000),('maiz','Maíz',2000),('chicharron','Chicharrón',3000),('salsa','Salsa de la casa',1000);
insert into mesas (n) select generate_series(1,8);
