create table if not exists catalog_items (
  id bigserial primary key,
  group_name text not null,
  value text not null,
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_name, value)
);

alter table catalog_items
  add column if not exists is_active boolean not null default true;

alter table catalog_items
  add column if not exists updated_at timestamptz not null default now();

create table if not exists movements (
  id bigserial primary key,
  business_line text not null check (business_line in ('Gimnasio', 'Restaurante')),
  movement_date date not null,
  movement_type text not null check (movement_type in ('Ingreso', 'Gasto', 'Costo')),
  category text not null,
  client_name text,
  description text not null,
  payment_status text not null check (payment_status in ('Pagado', 'Parcial', 'Pendiente')),
  payment_method text not null,
  total_amount numeric(14, 2) not null check (total_amount > 0),
  paid_amount numeric(14, 2) not null check (paid_amount >= 0),
  balance_due numeric(14, 2) not null check (balance_due >= 0),
  cash_flow numeric(14, 2) not null,
  year integer not null,
  month_number integer not null check (month_number between 1 and 12),
  month_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_amount <= total_amount),
  check (
    (payment_status = 'Pagado' and paid_amount = total_amount) or
    (payment_status = 'Parcial' and paid_amount > 0 and paid_amount < total_amount) or
    (payment_status = 'Pendiente' and paid_amount = 0)
  )
);

create table if not exists report_notes (
  id bigserial primary key,
  note_type text not null check (note_type in ('daily', 'weekly')),
  note_key text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_type, note_key)
);

create table if not exists clients (
  id bigserial primary key,
  full_name text not null,
  document_number text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id bigserial primary key,
  username text not null unique,
  full_name text not null default '',
  role text not null default 'administrador' check (role in ('administrador', 'asistente_operativo')),
  password_hash text not null,
  password_salt text not null,
  password_iterations integer not null,
  must_change_password boolean not null default false,
  password_changed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_users
  add column if not exists role text not null default 'administrador';

alter table app_users
  add column if not exists must_change_password boolean not null default false;

alter table app_users
  add column if not exists password_changed_at timestamptz;

update app_users
set role = 'administrador'
where role is null or role not in ('administrador', 'asistente_operativo');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_role_check'
  ) then
    alter table app_users
      add constraint app_users_role_check
      check (role in ('administrador', 'asistente_operativo'));
  end if;
end $$;

create table if not exists app_sessions (
  id bigserial primary key,
  user_id bigint not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists movement_edit_audits (
  id bigserial primary key,
  movement_id bigint not null references movements(id) on delete cascade,
  edited_by_user_id bigint not null references app_users(id),
  justification text not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists movement_collections (
  id bigserial primary key,
  movement_id bigint not null references movements(id) on delete cascade,
  collection_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text not null,
  notes text,
  registered_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now()
);

alter table movements
  drop constraint if exists movements_movement_type_check;

alter table movements
  add constraint movements_movement_type_check
  check (movement_type in ('Ingreso', 'Gasto', 'Costo'));

create table if not exists box_transfers (
  id bigserial primary key,
  transfer_date date not null,
  source_payment_method text not null,
  target_payment_method text not null,
  amount numeric(14, 2) not null check (amount > 0),
  notes text,
  registered_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now(),
  check (source_payment_method <> target_payment_method)
);

insert into catalog_items (group_name, value, sort_order) values
  ('gimnasioCategorias', 'Membresias', 1),
  ('gimnasioCategorias', 'Inscripcion', 2),
  ('gimnasioCategorias', 'Entrenamiento personalizado', 3),
  ('gimnasioCategorias', 'Venta de suplementos', 4),
  ('gimnasioCategorias', 'Venta de ropa/accesorios', 5),
  ('gimnasioCategorias', 'Eventos/retos', 6),
  ('gimnasioCategorias', 'Arriendo', 7),
  ('gimnasioCategorias', 'Nomina', 8),
  ('gimnasioCategorias', 'Servicios publicos', 9),
  ('gimnasioCategorias', 'Mantenimiento', 10),
  ('gimnasioCategorias', 'Limpieza', 11),
  ('gimnasioCategorias', 'Marketing', 12),
  ('gimnasioCategorias', 'Impuestos', 13),
  ('gimnasioCategorias', 'Papeleria', 14),
  ('gimnasioCategorias', 'Otros', 15),
  ('restauranteCategorias', 'Venta de bebidas', 1),
  ('restauranteCategorias', 'Venta de comidas', 2),
  ('restauranteCategorias', 'Venta de snacks', 3),
  ('restauranteCategorias', 'Venta de suplementos', 4),
  ('restauranteCategorias', 'Venta de combos', 5),
  ('restauranteCategorias', 'Compra de insumos', 6),
  ('restauranteCategorias', 'Nomina', 7),
  ('restauranteCategorias', 'Arriendo', 8),
  ('restauranteCategorias', 'Servicios publicos', 9),
  ('restauranteCategorias', 'Gas', 10),
  ('restauranteCategorias', 'Mantenimiento', 11),
  ('restauranteCategorias', 'Empaques', 12),
  ('restauranteCategorias', 'Marketing', 13),
  ('restauranteCategorias', 'Impuestos', 14),
  ('restauranteCategorias', 'Otros', 15),
  ('tipos', 'Ingreso', 1),
  ('tipos', 'Gasto', 2),
  ('tipos', 'Costo', 3),
  ('mediosPago', 'Efectivo', 1),
  ('mediosPago', 'Transferencia', 2),
  ('mediosPago', 'Datafono', 3),
  ('mediosPago', 'Nequi', 4),
  ('mediosPago', 'Daviplata', 5),
  ('mediosPago', 'Otro', 6),
  ('estadosPago', 'Pagado', 1),
  ('estadosPago', 'Parcial', 2),
  ('estadosPago', 'Pendiente', 3)
on conflict (group_name, value) do nothing;

update catalog_items
set
  is_active = true,
  sort_order = 3,
  updated_at = now()
where group_name = 'tipos'
  and value = 'Costo';
