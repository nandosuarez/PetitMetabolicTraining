create table if not exists catalog_items (
  id bigserial primary key,
  group_name text not null,
  value text not null,
  default_amount numeric(14, 2) not null default 0,
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

alter table catalog_items
  add column if not exists default_amount numeric(14, 2) not null default 0;

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
  inventory_product_id bigint,
  inventory_quantity numeric(14, 2) not null default 0,
  inventory_effect text not null default 'ninguno' check (
    inventory_effect in ('ninguno', 'entrada', 'salida')
  ),
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
  alias text,
  document_number text,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table clients
  add column if not exists alias text;

create table if not exists athletes (
  id bigserial primary key,
  full_name text not null,
  document_number text,
  birth_date date,
  phone text,
  email text,
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  medical_notes text not null default '',
  athlete_notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table athletes
  add column if not exists document_number text;

alter table athletes
  add column if not exists birth_date date;

alter table athletes
  add column if not exists phone text;

alter table athletes
  add column if not exists email text;

alter table athletes
  add column if not exists emergency_contact_name text not null default '';

alter table athletes
  add column if not exists emergency_contact_phone text not null default '';

alter table athletes
  add column if not exists medical_notes text not null default '';

alter table athletes
  add column if not exists athlete_notes text not null default '';

alter table athletes
  add column if not exists is_active boolean not null default true;

create table if not exists app_users (
  id bigserial primary key,
  username text not null unique,
  full_name text not null default '',
  role text not null default 'administrador' check (role in ('administrador', 'asistente_operativo', 'contador')),
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
where role is null or role not in ('administrador', 'asistente_operativo', 'contador');

alter table app_users
  drop constraint if exists app_users_role_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_role_check'
  ) then
    alter table app_users
      add constraint app_users_role_check
      check (role in ('administrador', 'asistente_operativo', 'contador'));
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

create table if not exists programming_methods (
  id bigserial primary key,
  name text not null,
  code text not null unique,
  description text not null,
  prescription_guide text not null default '',
  structure_hint text not null default '',
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists programming_exercises (
  id bigserial primary key,
  name text not null unique,
  family text not null check (
    family in (
      'multiarticular_tren_inferior',
      'multiarticular_tren_superior',
      'aislado_por_musculo',
      'hyrox_oficial',
      'potencia_explosividad'
    )
  ),
  category text not null,
  primary_muscle text not null,
  movement_pattern text not null default '',
  equipment text not null default '',
  coaching_notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_programs (
  id bigserial primary key,
  class_date date not null,
  title text not null,
  class_group text not null default '',
  focus_area text not null default '',
  method_id bigint not null references programming_methods(id),
  duration_minutes integer not null default 60 check (duration_minutes between 1 and 240),
  objective text not null default '',
  general_notes text not null default '',
  is_active boolean not null default true,
  created_by_user_id bigint not null references app_users(id),
  updated_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_program_items (
  id bigserial primary key,
  class_program_id bigint not null references class_programs(id) on delete cascade,
  sort_order integer not null default 1,
  block_name text not null default 'Bloque principal',
  exercise_id bigint not null references programming_exercises(id),
  method_id bigint references programming_methods(id),
  prescription text not null default '',
  condition_notes text not null default '',
  coach_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists class_program_enrollments (
  id bigserial primary key,
  class_program_id bigint not null references class_programs(id) on delete cascade,
  athlete_id bigint not null references athletes(id),
  general_notes text not null default '',
  created_by_user_id bigint not null references app_users(id),
  updated_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_program_id, athlete_id)
);

alter table class_program_enrollments
  add column if not exists athlete_id bigint references athletes(id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_program_enrollments'
      and column_name = 'client_id'
  ) then
    execute 'alter table class_program_enrollments alter column client_id drop not null';
  end if;
end
$$;

drop index if exists class_program_enrollments_program_athlete_unique;

create unique index if not exists class_program_enrollments_program_athlete_unique
  on class_program_enrollments (class_program_id, athlete_id);

create table if not exists class_program_enrollment_results (
  id bigserial primary key,
  enrollment_id bigint not null references class_program_enrollments(id) on delete cascade,
  item_sort_order integer not null check (item_sort_order > 0),
  exercise_name_snapshot text not null default '',
  result_weight_text text not null default '',
  result_time_text text not null default '',
  result_notes text not null default '',
  updated_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, item_sort_order)
);

create table if not exists accounting_documents (
  id bigserial primary key,
  accounting_date date not null,
  business_line text not null check (business_line in ('Gimnasio', 'Restaurante', 'General')),
  document_area text not null check (document_area in ('Venta', 'Compra', 'Gasto', 'Impuesto', 'Nomina', 'Soporte', 'Otro')),
  document_type text not null,
  reference text not null default '',
  notes text not null default '',
  original_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0),
  file_content bytea not null,
  uploaded_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists accounting_document_downloads (
  id bigserial primary key,
  accounting_document_id bigint not null references accounting_documents(id) on delete cascade,
  downloaded_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists inventory_assets (
  id bigserial primary key,
  name text not null,
  category text not null,
  location text not null default '',
  condition_status text not null default 'Operativo',
  brand_model text not null default '',
  serial_number text not null default '',
  purchase_date date,
  purchase_value numeric(14, 2) not null default 0,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_products (
  id bigserial primary key,
  name text not null,
  area text not null check (area in ('Gimnasio', 'Restaurante', 'Tienda', 'Suplementos', 'General')),
  item_kind text not null default 'Insumo',
  tracks_stock boolean not null default true,
  category text not null,
  unit_name text not null,
  current_stock numeric(14, 2) not null default 0,
  minimum_stock numeric(14, 2) not null default 0,
  cost_price numeric(14, 2) not null default 0,
  sale_price numeric(14, 2) not null default 0,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists inventory_products
  add column if not exists item_kind text not null default 'Insumo';

alter table if exists inventory_products
  add column if not exists tracks_stock boolean not null default true;

update inventory_products
set item_kind = 'Insumo'
where coalesce(trim(item_kind), '') = '';

update inventory_products
set tracks_stock = false
where item_kind = 'Servicio';

create table if not exists business_products (
  id bigserial primary key,
  name text not null,
  business_line text not null check (business_line in ('Gimnasio', 'Restaurante')),
  inventory_product_id bigint references inventory_products(id) on delete set null,
  item_type text not null default 'Producto',
  category text not null default '',
  default_amount numeric(14, 2) not null default 0,
  direct_inventory_product_id bigint references inventory_products(id) on delete set null,
  direct_inventory_quantity numeric(14, 2) not null default 0,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists business_products
  add column if not exists inventory_product_id bigint references inventory_products(id) on delete set null;

update business_products
set inventory_product_id = direct_inventory_product_id
where inventory_product_id is null
  and direct_inventory_product_id is not null;

update business_products bp
set inventory_product_id = ip.id
from inventory_products ip
where bp.inventory_product_id is null
  and lower(trim(bp.name)) = lower(trim(ip.name))
  and ip.area = case
    when bp.business_line = 'Gimnasio' then 'Gimnasio'
    else 'Restaurante'
  end
  and lower(trim(coalesce(bp.category, ''))) = lower(trim(coalesce(ip.category, '')));

create temporary table if not exists missing_business_product_links on commit drop as
select
  bp.id as business_product_id,
  bp.name,
  bp.business_line,
  bp.item_type,
  bp.category,
  bp.default_amount,
  bp.notes,
  ('legacy-bp-' || bp.id::text) as legacy_link_key
from business_products bp
where bp.inventory_product_id is null;

insert into inventory_products (
  name,
  area,
  item_kind,
  tracks_stock,
  category,
  unit_name,
  current_stock,
  minimum_stock,
  cost_price,
  sale_price,
  notes,
  is_active
)
select
  m.name,
  case
    when m.business_line = 'Gimnasio' then 'Gimnasio'
    else 'Restaurante'
  end as area,
  case
    when lower(trim(m.item_type)) = 'servicio' then 'Servicio'
    else 'Producto de venta'
  end as item_kind,
  false as tracks_stock,
  coalesce(nullif(trim(m.category), ''), 'General') as category,
  case
    when lower(trim(m.item_type)) = 'servicio' then 'Servicio'
    else 'Unidad'
  end as unit_name,
  0 as current_stock,
  0 as minimum_stock,
  0 as cost_price,
  coalesce(m.default_amount, 0) as sale_price,
  trim(concat(
    coalesce(nullif(trim(m.notes), ''), ''),
    case
      when coalesce(nullif(trim(m.notes), ''), '') = '' then ''
      else ' | '
    end,
    'Migrado desde producto/servicio legacy (',
    m.legacy_link_key,
    ')'
  )) as notes,
  true as is_active
from missing_business_product_links m;

update business_products bp
set inventory_product_id = ip.id
from missing_business_product_links m
join inventory_products ip
  on lower(trim(ip.name)) = lower(trim(m.name))
 and ip.area = case
   when m.business_line = 'Gimnasio' then 'Gimnasio'
   else 'Restaurante'
 end
 and lower(trim(coalesce(ip.category, ''))) = lower(trim(coalesce(m.category, '')))
 and ip.notes ilike ('%' || m.legacy_link_key || '%')
where bp.id = m.business_product_id
  and bp.inventory_product_id is null;

create table if not exists business_product_components (
  id bigserial primary key,
  business_product_id bigint not null references business_products(id) on delete cascade,
  inventory_product_id bigint not null references inventory_products(id) on delete restrict,
  quantity numeric(14, 2) not null check (quantity > 0),
  notes text not null default '',
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_product_id, inventory_product_id)
);

create table if not exists inventory_stock_movements (
  id bigserial primary key,
  inventory_product_id bigint not null references inventory_products(id) on delete cascade,
  source_movement_id bigint references movements(id) on delete set null,
  movement_date date not null,
  movement_type text not null check (
    movement_type in ('entrada', 'salida', 'ajuste_positivo', 'ajuste_negativo')
  ),
  quantity numeric(14, 2) not null check (quantity > 0),
  unit_cost numeric(14, 2) not null default 0,
  stock_before numeric(14, 2) not null default 0,
  stock_after numeric(14, 2) not null default 0,
  reference text not null default '',
  notes text not null default '',
  registered_by_user_id bigint not null references app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_stock_movements_product_idx
  on inventory_stock_movements(inventory_product_id, movement_date desc, created_at desc);

create index if not exists business_products_line_idx
  on business_products(business_line, is_active, name);

create index if not exists business_product_components_product_idx
  on business_product_components(business_product_id, sort_order, id);

alter table movements
  add column if not exists inventory_product_id bigint;

alter table movements
  add column if not exists inventory_quantity numeric(14, 2) not null default 0;

alter table movements
  add column if not exists inventory_effect text not null default 'ninguno';

alter table movements
  drop constraint if exists movements_inventory_effect_check;

alter table movements
  add constraint movements_inventory_effect_check
  check (inventory_effect in ('ninguno', 'entrada', 'salida'));

alter table movements
  drop constraint if exists movements_inventory_product_id_fkey;

alter table movements
  add constraint movements_inventory_product_id_fkey
  foreign key (inventory_product_id) references inventory_products(id);

alter table movements
  add column if not exists business_product_id bigint references business_products(id) on delete set null;

alter table inventory_stock_movements
  add column if not exists source_movement_id bigint references movements(id) on delete set null;

create index if not exists accounting_document_downloads_document_idx
  on accounting_document_downloads(accounting_document_id, created_at desc);

alter table accounting_documents
  add column if not exists updated_at timestamptz not null default now();

alter table accounting_documents
  add column if not exists updated_by_user_id bigint references app_users(id);

alter table class_program_items
  add column if not exists repetition_text text not null default '';

alter table class_program_items
  add column if not exists weight_text text not null default '';

insert into programming_methods (
  name,
  code,
  description,
  prescription_guide,
  structure_hint,
  sort_order
) values
  (
    'AMRAP',
    'AMRAP',
    'Completa la mayor cantidad de rondas o repeticiones posibles dentro de un tiempo definido.',
    'Define el tiempo total, el orden de ejercicios y la forma de contar el score.',
    'Ejemplo: 12 minutos · 10 wall balls + 12 lunges + 14 cal row',
    1
  ),
  (
    'EMOM',
    'EMOM',
    'Cada minuto en el minuto. El trabajo se repite al inicio de cada minuto.',
    'Marca minutos totales, tarea por minuto y si hay rotación o alternancia entre estaciones.',
    'Ejemplo: 16 minutos · Min 1 12 thrusters / Min 2 10 burpees',
    2
  ),
  (
    'For Time',
    'FOR_TIME',
    'El atleta completa un volumen de trabajo lo más rápido posible con técnica y estándar definidos.',
    'Indica volumen total, time cap y estándar de cierre o score final.',
    'Ejemplo: 4 rondas por tiempo · 400 m run + 20 push press',
    3
  ),
  (
    'Intervalos',
    'INTERVALOS',
    'Bloques de trabajo y descanso con tiempos o distancias específicas.',
    'Especifica relación trabajo/pausa, cantidad de series y criterio de intensidad.',
    'Ejemplo: 6 x 40 segundos ON / 20 segundos OFF',
    4
  ),
  (
    'Tabata',
    'TABATA',
    'Protocolo clásico de intervalos cortos: 20 segundos de trabajo por 10 de pausa.',
    'Aclara rounds, ejercicio y si se rota entre estaciones o movimientos.',
    'Ejemplo: 8 rondas · air bike / wall sit alternado',
    5
  ),
  (
    'Bloques de fuerza',
    'FUERZA',
    'Trabajo estructurado por series, repeticiones, tempo, carga y descanso.',
    'Usa series, reps, porcentaje o RPE, tempo y pausa entre series.',
    'Ejemplo: 5 x 5 back squat @RPE 8 · 90 segundos de descanso',
    6
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  prescription_guide = excluded.prescription_guide,
  structure_hint = excluded.structure_hint,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into programming_exercises (
  name,
  family,
  category,
  primary_muscle,
  movement_pattern,
  equipment,
  coaching_notes
) values
  ('Back Squat', 'multiarticular_tren_inferior', 'Sentadilla bilateral', 'Cuádriceps y glúteos', 'Sentadilla', 'Barra', 'Buscar profundidad consistente y control del tronco.'),
  ('Front Squat', 'multiarticular_tren_inferior', 'Sentadilla anterior', 'Cuádriceps', 'Sentadilla', 'Barra', 'Mantener codos altos y torso vertical.'),
  ('Deadlift', 'multiarticular_tren_inferior', 'Bisagra pesada', 'Cadena posterior', 'Bisagra', 'Barra', 'Despegar el piso con tensión dorsal y columna neutra.'),
  ('Romanian Deadlift', 'multiarticular_tren_inferior', 'Bisagra controlada', 'Isquiosurales y glúteos', 'Bisagra', 'Barra o mancuernas', 'Priorizar recorrido limpio y tensión posterior.'),
  ('Walking Lunge', 'multiarticular_tren_inferior', 'Desplante', 'Glúteos y cuádriceps', 'Zancada', 'Mancuernas o peso corporal', 'Controlar la rodilla delantera y la estabilidad.'),
  ('Bulgarian Split Squat', 'multiarticular_tren_inferior', 'Unilateral', 'Glúteos y cuádriceps', 'Zancada', 'Banco y mancuernas', 'Mantener pelvis estable y rango completo.'),
  ('Hip Thrust', 'multiarticular_tren_inferior', 'Extensión de cadera', 'Glúteos', 'Puente de cadera', 'Barra', 'Pausa arriba y costillas controladas.'),
  ('Bench Press', 'multiarticular_tren_superior', 'Empuje horizontal', 'Pecho', 'Empuje horizontal', 'Barra', 'Escápulas estables y pies activos en el piso.'),
  ('Push Press', 'multiarticular_tren_superior', 'Empuje vertical', 'Hombros y tríceps', 'Empuje vertical', 'Barra', 'Usar impulso de piernas sin perder la línea del tronco.'),
  ('Strict Press', 'multiarticular_tren_superior', 'Empuje vertical estricto', 'Hombros', 'Empuje vertical', 'Barra o mancuernas', 'Evitar hiperextensión lumbar.'),
  ('Pull-Up', 'multiarticular_tren_superior', 'Jalón vertical', 'Espalda', 'Jalón vertical', 'Barra fija', 'Arrancar desde extensión completa y mentón claro.'),
  ('Bent Over Row', 'multiarticular_tren_superior', 'Jalón horizontal', 'Espalda media', 'Jalón horizontal', 'Barra', 'Mantener charnela y tracción al ombligo o costillas.'),
  ('Ring Row', 'multiarticular_tren_superior', 'Jalón horizontal suspendido', 'Espalda', 'Jalón horizontal', 'Anillas', 'Mantener cuerpo alineado en todo el recorrido.'),
  ('Thruster', 'multiarticular_tren_superior', 'Empuje total', 'Piernas y hombros', 'Sentadilla + empuje', 'Barra o mancuernas', 'Conectar sentadilla con extensión final sin cortar el impulso.'),
  ('Biceps Curl', 'aislado_por_musculo', 'Aislado de brazos', 'Bíceps', 'Flexión de codo', 'Mancuernas o barra', 'Evitar balanceo del tronco.'),
  ('Triceps Extension', 'aislado_por_musculo', 'Aislado de brazos', 'Tríceps', 'Extensión de codo', 'Polea, mancuerna o banda', 'Fijar hombro y cerrar bien el codo.'),
  ('Lateral Raise', 'aislado_por_musculo', 'Aislado de hombro', 'Deltoides medio', 'Abducción de hombro', 'Mancuernas', 'Subir con control y sin encoger hombros.'),
  ('Leg Extension', 'aislado_por_musculo', 'Aislado de pierna', 'Cuádriceps', 'Extensión de rodilla', 'Máquina', 'Pausa breve arriba y descenso controlado.'),
  ('Leg Curl', 'aislado_por_musculo', 'Aislado de pierna', 'Isquiosurales', 'Flexión de rodilla', 'Máquina', 'Evitar levantar la cadera del apoyo.'),
  ('Calf Raise', 'aislado_por_musculo', 'Aislado de pierna', 'Pantorrillas', 'Flexión plantar', 'Máquina o step', 'Buscar rango completo y pausa arriba.'),
  ('SkiErg', 'hyrox_oficial', 'Ergómetro oficial HYROX', 'Espalda y core', 'Condicionamiento cíclico', 'SkiErg', 'Mantener ritmo sostenible y extensión completa.'),
  ('Sled Push', 'hyrox_oficial', 'HYROX oficial', 'Piernas y core', 'Empuje horizontal', 'Trineo', 'Ángulo corporal estable y pasos cortos potentes.'),
  ('Sled Pull', 'hyrox_oficial', 'HYROX oficial', 'Espalda y piernas', 'Jalón horizontal', 'Trineo y cuerda', 'Coordinar brace y zancada de retroceso.'),
  ('Burpee Broad Jump', 'hyrox_oficial', 'HYROX oficial', 'Cuerpo completo', 'Salto horizontal', 'Peso corporal', 'Mantener estándar de pecho al piso y salto claro.'),
  ('Row', 'hyrox_oficial', 'Ergómetro oficial HYROX', 'Cadena posterior', 'Condicionamiento cíclico', 'Remo', 'Usar secuencia piernas-tronco-brazos.'),
  ('Farmers Carry', 'hyrox_oficial', 'HYROX oficial', 'Agarre y core', 'Carry', 'Kettlebells o mancuernas', 'Postura alta y pasos eficientes.'),
  ('Sandbag Lunges', 'hyrox_oficial', 'HYROX oficial', 'Piernas y core', 'Zancada', 'Sandbag', 'Apoyar la rodilla con control y torso estable.'),
  ('Wall Balls', 'hyrox_oficial', 'HYROX oficial', 'Piernas, hombros y core', 'Sentadilla + lanzamiento', 'Balón medicinal y target', 'Sincronizar profundidad con lanzamiento preciso.')
on conflict (name) do nothing;

drop table if exists programming_exercise_seed;

create temporary table programming_exercise_seed (
  name text primary key,
  family text not null,
  category text not null,
  primary_muscle text not null,
  movement_pattern text not null default '',
  equipment text not null default '',
  coaching_notes text not null default ''
) on commit drop;

insert into programming_exercise_seed (
  name,
  family,
  category,
  primary_muscle,
  movement_pattern,
  equipment,
  coaching_notes
) values
  ('Sentadilla libre', 'multiarticular_tren_inferior', 'Sentadilla bilateral', 'Cuádriceps, glúteos, core, aductores', 'Sentadilla', 'Barra', ''),
  ('Sentadilla frontal', 'multiarticular_tren_inferior', 'Sentadilla anterior', 'Cuádriceps, glúteos, core', 'Sentadilla', 'Barra', ''),
  ('Sentadilla goblet', 'multiarticular_tren_inferior', 'Sentadilla goblet', 'Cuádriceps, glúteos, core', 'Sentadilla', 'Mancuerna o kettlebell', ''),
  ('Sentadilla sumo', 'multiarticular_tren_inferior', 'Sentadilla sumo', 'Glúteos, aductores, cuádriceps', 'Sentadilla', 'Barra, mancuerna o kettlebell', ''),
  ('Sentadilla búlgara', 'multiarticular_tren_inferior', 'Sentadilla unilateral', 'Glúteos, cuádriceps, isquiotibiales', 'Zancada', 'Banco y mancuernas', ''),
  ('Zancadas caminando', 'multiarticular_tren_inferior', 'Zancada', 'Glúteos, cuádriceps, isquiotibiales', 'Zancada', 'Peso corporal, mancuernas o barra', ''),
  ('Zancadas hacia atrás', 'multiarticular_tren_inferior', 'Zancada', 'Glúteos, cuádriceps, core', 'Zancada', 'Peso corporal, mancuernas o barra', ''),
  ('Step-up o subida al cajón', 'multiarticular_tren_inferior', 'Step-up', 'Glúteos, cuádriceps, pantorrillas', 'Subida al cajón', 'Cajón, banco o step', ''),
  ('Peso muerto convencional', 'multiarticular_tren_inferior', 'Bisagra', 'Isquiotibiales, glúteos, espalda baja', 'Bisagra', 'Barra', ''),
  ('Peso muerto rumano', 'multiarticular_tren_inferior', 'Bisagra', 'Isquiotibiales, glúteos, espalda baja', 'Bisagra', 'Barra o mancuernas', ''),
  ('Peso muerto sumo', 'multiarticular_tren_inferior', 'Bisagra', 'Glúteos, aductores, isquiotibiales', 'Bisagra', 'Barra', ''),
  ('Hip thrust', 'multiarticular_tren_inferior', 'Empuje de cadera', 'Glúteos, isquiotibiales, core', 'Extensión de cadera', 'Barra', ''),
  ('Puente de glúteo con barra', 'multiarticular_tren_inferior', 'Empuje de cadera', 'Glúteos, isquiotibiales', 'Extensión de cadera', 'Barra', ''),
  ('Prensa de piernas', 'multiarticular_tren_inferior', 'Prensa', 'Cuádriceps, glúteos, isquiotibiales', 'Prensa', 'Máquina de prensa', ''),
  ('Hack squat', 'multiarticular_tren_inferior', 'Sentadilla guiada', 'Cuádriceps, glúteos', 'Sentadilla', 'Máquina hack', ''),
  ('Sentadilla en multipower', 'multiarticular_tren_inferior', 'Sentadilla guiada', 'Cuádriceps, glúteos', 'Sentadilla', 'Multipower', ''),
  ('Buenos días / Good morning', 'multiarticular_tren_inferior', 'Bisagra', 'Isquiotibiales, glúteos, espalda baja', 'Bisagra', 'Barra', ''),
  ('Estocada lateral', 'multiarticular_tren_inferior', 'Zancada lateral', 'Glúteos, aductores, cuádriceps', 'Plano frontal', 'Peso corporal o mancuernas', ''),
  ('Cossack squat', 'multiarticular_tren_inferior', 'Sentadilla lateral', 'Aductores, glúteos, cuádriceps', 'Plano frontal', 'Peso corporal o kettlebell', ''),
  ('Thruster con mancuernas o barra', 'multiarticular_tren_inferior', 'Sentadilla + empuje', 'Piernas, glúteos, hombros, core', 'Sentadilla + empuje', 'Barra o mancuernas', ''),
  ('Clean / cargada', 'multiarticular_tren_inferior', 'Levantamiento olímpico', 'Piernas, glúteos, espalda, core', 'Triple extensión', 'Barra o mancuernas', ''),
  ('Snatch / arranque', 'multiarticular_tren_inferior', 'Levantamiento olímpico', 'Piernas, glúteos, espalda, hombros, core', 'Triple extensión', 'Barra, mancuerna o kettlebell', ''),
  ('Kettlebell swing', 'multiarticular_tren_inferior', 'Bisagra explosiva', 'Glúteos, isquiotibiales, core', 'Bisagra', 'Kettlebell', ''),
  ('Sled push / empuje de trineo', 'multiarticular_tren_inferior', 'Empuje de trineo', 'Cuádriceps, glúteos, pantorrillas', 'Empuje horizontal', 'Trineo', ''),
  ('Sled pull / arrastre de trineo', 'multiarticular_tren_inferior', 'Arrastre de trineo', 'Cuádriceps, glúteos, isquiotibiales', 'Jalón horizontal', 'Trineo y cuerda', ''),
  ('Press de banca plano', 'multiarticular_tren_superior', 'Empuje horizontal', 'Pecho, tríceps, hombro anterior', 'Empuje horizontal', 'Barra y banco', ''),
  ('Press de banca inclinado', 'multiarticular_tren_superior', 'Empuje horizontal', 'Pecho superior, tríceps, hombro anterior', 'Empuje horizontal', 'Barra o mancuernas y banco inclinado', ''),
  ('Press de banca declinado', 'multiarticular_tren_superior', 'Empuje horizontal', 'Pecho inferior, tríceps', 'Empuje horizontal', 'Barra o mancuernas y banco declinado', ''),
  ('Flexiones de pecho', 'multiarticular_tren_superior', 'Empuje horizontal', 'Pecho, tríceps, hombros, core', 'Empuje horizontal', 'Peso corporal', ''),
  ('Fondos en paralelas', 'multiarticular_tren_superior', 'Fondos', 'Pecho, tríceps, hombro anterior', 'Empuje vertical', 'Paralelas', ''),
  ('Press militar de pie', 'multiarticular_tren_superior', 'Empuje vertical', 'Hombros, tríceps, core', 'Empuje vertical', 'Barra o mancuernas', ''),
  ('Press militar sentado', 'multiarticular_tren_superior', 'Empuje vertical', 'Hombros, tríceps', 'Empuje vertical', 'Mancuernas o barra y banco', ''),
  ('Push press', 'multiarticular_tren_superior', 'Empuje vertical dinámico', 'Hombros, tríceps, piernas, core', 'Empuje vertical', 'Barra o mancuernas', ''),
  ('Remo con barra', 'multiarticular_tren_superior', 'Jalón horizontal', 'Espalda, bíceps, core', 'Jalón horizontal', 'Barra', ''),
  ('Remo con mancuernas', 'multiarticular_tren_superior', 'Jalón horizontal', 'Espalda, bíceps, hombro posterior', 'Jalón horizontal', 'Mancuernas', ''),
  ('Remo en máquina', 'multiarticular_tren_superior', 'Jalón horizontal', 'Espalda, bíceps', 'Jalón horizontal', 'Máquina', ''),
  ('Remo en polea baja', 'multiarticular_tren_superior', 'Jalón horizontal', 'Espalda, bíceps', 'Jalón horizontal', 'Polea baja', ''),
  ('Dominadas', 'multiarticular_tren_superior', 'Jalón vertical', 'Espalda, bíceps, core', 'Jalón vertical', 'Barra fija', ''),
  ('Jalón al pecho', 'multiarticular_tren_superior', 'Jalón vertical', 'Espalda, bíceps', 'Jalón vertical', 'Polea alta', ''),
  ('Chin ups / dominadas supinas', 'multiarticular_tren_superior', 'Jalón vertical', 'Espalda, bíceps', 'Jalón vertical', 'Barra fija', ''),
  ('Landmine press', 'multiarticular_tren_superior', 'Empuje diagonal', 'Hombros, pecho superior, tríceps, core', 'Empuje diagonal', 'Landmine o barra anclada', ''),
  ('Clean and press', 'multiarticular_tren_superior', 'Levantamiento total', 'Hombros, espalda, brazos, piernas, core', 'Triple extensión + empuje', 'Barra, mancuernas o kettlebells', ''),
  ('Renegade row', 'multiarticular_tren_superior', 'Jalón unilateral', 'Espalda, bíceps, core, hombros', 'Jalón horizontal', 'Mancuernas', ''),
  ('Muscle up', 'multiarticular_tren_superior', 'Gimnástico', 'Espalda, pecho, tríceps, bíceps, core', 'Tracción + empuje', 'Barra o anillas', ''),
  ('Burpee con flexión', 'multiarticular_tren_superior', 'Burpee', 'Pecho, hombros, tríceps, core, piernas', 'Empuje metabólico', 'Peso corporal', ''),
  ('Aperturas con mancuernas', 'aislado_por_musculo', 'Pecho', 'Pectoral mayor', 'Aducción horizontal', 'Mancuernas y banco', ''),
  ('Aperturas en máquina peck deck', 'aislado_por_musculo', 'Pecho', 'Pectoral mayor', 'Aducción horizontal', 'Máquina peck deck', ''),
  ('Cruce de poleas', 'aislado_por_musculo', 'Pecho', 'Pectoral mayor', 'Aducción horizontal', 'Poleas', ''),
  ('Cruce de poleas de abajo hacia arriba', 'aislado_por_musculo', 'Pecho', 'Pectoral superior', 'Aducción horizontal', 'Poleas', ''),
  ('Cruce de poleas de arriba hacia abajo', 'aislado_por_musculo', 'Pecho', 'Pectoral inferior', 'Aducción horizontal', 'Poleas', ''),
  ('Press squeeze con mancuernas', 'aislado_por_musculo', 'Pecho', 'Pectoral interno', 'Empuje horizontal', 'Mancuernas', ''),
  ('Pullover con mancuerna', 'aislado_por_musculo', 'Pecho', 'Serrato anterior', 'Pullover', 'Mancuerna y banco', ''),
  ('Punch en polea', 'aislado_por_musculo', 'Pecho', 'Serrato anterior', 'Protracción escapular', 'Polea', ''),
  ('Pullover en polea alta', 'aislado_por_musculo', 'Espalda', 'Dorsal ancho', 'Extensión de hombro', 'Polea alta', ''),
  ('Jalón con brazos rectos', 'aislado_por_musculo', 'Espalda', 'Dorsal ancho', 'Extensión de hombro', 'Polea alta', ''),
  ('Encogimientos con mancuernas', 'aislado_por_musculo', 'Espalda', 'Trapecio superior', 'Elevación escapular', 'Mancuernas', ''),
  ('Encogimientos con barra', 'aislado_por_musculo', 'Espalda', 'Trapecio superior', 'Elevación escapular', 'Barra', ''),
  ('Pájaros en banco inclinado', 'aislado_por_musculo', 'Espalda', 'Trapecio medio', 'Apertura posterior', 'Mancuernas y banco inclinado', ''),
  ('Elevaciones en Y', 'aislado_por_musculo', 'Espalda', 'Trapecio inferior', 'Elevación escapular', 'Mancuernas, discos o peso corporal', ''),
  ('Retracciones escapulares', 'aislado_por_musculo', 'Espalda', 'Romboides', 'Retracción escapular', 'Polea, banda o barra', ''),
  ('Extensión lumbar en banco', 'aislado_por_musculo', 'Espalda', 'Lumbar / erectores espinales', 'Extensión lumbar', 'Banco romano', ''),
  ('Superman controlado', 'aislado_por_musculo', 'Espalda', 'Lumbar / erectores espinales', 'Extensión lumbar', 'Peso corporal', ''),
  ('Elevación frontal con mancuernas', 'aislado_por_musculo', 'Hombros', 'Deltoide anterior', 'Flexión de hombro', 'Mancuernas', ''),
  ('Elevación frontal con disco', 'aislado_por_musculo', 'Hombros', 'Deltoide anterior', 'Flexión de hombro', 'Disco', ''),
  ('Elevación lateral con mancuernas', 'aislado_por_musculo', 'Hombros', 'Deltoide lateral', 'Abducción de hombro', 'Mancuernas', ''),
  ('Elevación lateral en polea', 'aislado_por_musculo', 'Hombros', 'Deltoide lateral', 'Abducción de hombro', 'Polea', ''),
  ('Pájaros con mancuernas', 'aislado_por_musculo', 'Hombros', 'Deltoide posterior', 'Apertura posterior', 'Mancuernas', ''),
  ('Face pull', 'aislado_por_musculo', 'Hombros', 'Deltoide posterior, trapecio, manguito rotador', 'Tracción alta', 'Polea y cuerda', ''),
  ('Reverse peck deck', 'aislado_por_musculo', 'Hombros', 'Deltoide posterior', 'Apertura posterior', 'Máquina peck deck', ''),
  ('Rotación externa con banda', 'aislado_por_musculo', 'Hombros', 'Manguito rotador', 'Rotación externa', 'Banda', ''),
  ('Rotación interna con banda', 'aislado_por_musculo', 'Hombros', 'Manguito rotador', 'Rotación interna', 'Banda', ''),
  ('Cuban rotation', 'aislado_por_musculo', 'Hombros', 'Manguito rotador', 'Rotación externa', 'Mancuernas o barra ligera', ''),
  ('Curl con barra', 'aislado_por_musculo', 'Bíceps', 'Bíceps braquial', 'Flexión de codo', 'Barra', ''),
  ('Curl con mancuernas', 'aislado_por_musculo', 'Bíceps', 'Bíceps braquial', 'Flexión de codo', 'Mancuernas', ''),
  ('Curl predicador', 'aislado_por_musculo', 'Bíceps', 'Bíceps braquial', 'Flexión de codo', 'Banco predicador', ''),
  ('Curl en polea baja', 'aislado_por_musculo', 'Bíceps', 'Bíceps braquial', 'Flexión de codo', 'Polea baja', ''),
  ('Curl inclinado con mancuernas', 'aislado_por_musculo', 'Bíceps', 'Cabeza larga del bíceps', 'Flexión de codo', 'Mancuernas y banco inclinado', ''),
  ('Curl concentrado', 'aislado_por_musculo', 'Bíceps', 'Cabeza corta del bíceps', 'Flexión de codo', 'Mancuerna', ''),
  ('Curl martillo', 'aislado_por_musculo', 'Bíceps / antebrazo', 'Braquial anterior, braquiorradial', 'Flexión de codo', 'Mancuernas o cuerda en polea', ''),
  ('Extensión en polea alta', 'aislado_por_musculo', 'Tríceps', 'Tríceps completo', 'Extensión de codo', 'Polea alta', ''),
  ('Pressdown con cuerda', 'aislado_por_musculo', 'Tríceps', 'Tríceps completo', 'Extensión de codo', 'Polea y cuerda', ''),
  ('Extensión por encima de la cabeza', 'aislado_por_musculo', 'Tríceps', 'Cabeza larga del tríceps', 'Extensión de codo', 'Mancuerna, polea o barra', ''),
  ('French press', 'aislado_por_musculo', 'Tríceps', 'Cabeza larga del tríceps', 'Extensión de codo', 'Barra Z o mancuernas', ''),
  ('Extensión en polea con barra recta', 'aislado_por_musculo', 'Tríceps', 'Cabeza lateral del tríceps', 'Extensión de codo', 'Polea y barra recta', ''),
  ('Extensión en polea agarre inverso', 'aislado_por_musculo', 'Tríceps', 'Cabeza medial del tríceps', 'Extensión de codo', 'Polea y barra corta', ''),
  ('Patada de tríceps con mancuerna', 'aislado_por_musculo', 'Tríceps', 'Tríceps', 'Extensión de codo', 'Mancuerna', ''),
  ('Curl de muñeca', 'aislado_por_musculo', 'Antebrazo', 'Flexores del antebrazo', 'Flexión de muñeca', 'Barra, mancuerna o polea', ''),
  ('Curl inverso de muñeca', 'aislado_por_musculo', 'Antebrazo', 'Extensores del antebrazo', 'Extensión de muñeca', 'Barra, mancuerna o polea', ''),
  ('Curl inverso', 'aislado_por_musculo', 'Antebrazo', 'Braquiorradial', 'Flexión de codo', 'Barra o mancuerna', ''),
  ('Farmer hold', 'aislado_por_musculo', 'Antebrazo', 'Agarre', 'Agarre isométrico', 'Mancuernas o kettlebells', ''),
  ('Pinza con discos', 'aislado_por_musculo', 'Antebrazo', 'Agarre', 'Pinza isométrica', 'Discos', ''),
  ('Pronación con mancuerna', 'aislado_por_musculo', 'Antebrazo', 'Pronadores', 'Pronación', 'Mancuerna', ''),
  ('Supinación con mancuerna', 'aislado_por_musculo', 'Antebrazo', 'Supinadores', 'Supinación', 'Mancuerna', ''),
  ('Extensión de piernas en máquina', 'aislado_por_musculo', 'Cuádriceps', 'Cuádriceps completo', 'Extensión de rodilla', 'Máquina', ''),
  ('Extensión de piernas con punta neutra', 'aislado_por_musculo', 'Cuádriceps', 'Recto femoral', 'Extensión de rodilla', 'Máquina', ''),
  ('Extensión de piernas con pausa arriba', 'aislado_por_musculo', 'Cuádriceps', 'Vasto medial', 'Extensión de rodilla', 'Máquina', ''),
  ('Extensión de piernas con control lento', 'aislado_por_musculo', 'Cuádriceps', 'Vasto lateral', 'Extensión de rodilla', 'Máquina', ''),
  ('Sissy squat asistida', 'aislado_por_musculo', 'Cuádriceps', 'Cuádriceps', 'Extensión de rodilla', 'Peso corporal o soporte', ''),
  ('Wall sit / sentadilla isométrica en pared', 'aislado_por_musculo', 'Cuádriceps', 'Cuádriceps', 'Isometría', 'Pared', ''),
  ('Curl femoral acostado', 'aislado_por_musculo', 'Isquiotibiales', 'Isquiotibiales completo', 'Flexión de rodilla', 'Máquina', ''),
  ('Curl femoral sentado', 'aislado_por_musculo', 'Isquiotibiales', 'Isquiotibiales completo', 'Flexión de rodilla', 'Máquina', ''),
  ('Curl femoral de pie', 'aislado_por_musculo', 'Isquiotibiales', 'Isquiotibiales completo', 'Flexión de rodilla', 'Máquina', ''),
  ('Curl femoral con punta ligeramente hacia afuera', 'aislado_por_musculo', 'Isquiotibiales', 'Bíceps femoral', 'Flexión de rodilla', 'Máquina', ''),
  ('Curl femoral con punta ligeramente hacia adentro', 'aislado_por_musculo', 'Isquiotibiales', 'Semitendinoso / semimembranoso', 'Flexión de rodilla', 'Máquina', ''),
  ('Nordic curl asistido', 'aislado_por_musculo', 'Isquiotibiales', 'Isquiotibiales', 'Flexión de rodilla', 'Soporte o compañero', ''),
  ('Curl femoral con fitball', 'aislado_por_musculo', 'Isquiotibiales', 'Isquiotibiales', 'Flexión de rodilla', 'Fitball', ''),
  ('Patada de glúteo en polea', 'aislado_por_musculo', 'Glúteos', 'Glúteo mayor', 'Extensión de cadera', 'Polea', ''),
  ('Patada de glúteo en máquina', 'aislado_por_musculo', 'Glúteos', 'Glúteo mayor', 'Extensión de cadera', 'Máquina', ''),
  ('Puente de glúteo', 'aislado_por_musculo', 'Glúteos', 'Glúteo mayor', 'Extensión de cadera', 'Peso corporal, barra o banda', ''),
  ('Frog pumps', 'aislado_por_musculo', 'Glúteos', 'Glúteo mayor', 'Extensión de cadera', 'Peso corporal o banda', ''),
  ('Abducción de cadera en máquina', 'aislado_por_musculo', 'Glúteos', 'Glúteo medio', 'Abducción de cadera', 'Máquina', ''),
  ('Caminata lateral con banda', 'aislado_por_musculo', 'Glúteos / abductores', 'Glúteo medio', 'Abducción de cadera', 'Banda', ''),
  ('Clamshell', 'aislado_por_musculo', 'Glúteos', 'Glúteo medio', 'Abducción de cadera', 'Banda o peso corporal', ''),
  ('Abducción lateral acostado', 'aislado_por_musculo', 'Glúteos / abductores', 'Glúteo menor', 'Abducción de cadera', 'Peso corporal o tobilleras', ''),
  ('Abducción en polea', 'aislado_por_musculo', 'Glúteos', 'Glúteo menor', 'Abducción de cadera', 'Polea', ''),
  ('Máquina de aductores', 'aislado_por_musculo', 'Aductores', 'Aductores', 'Aducción de cadera', 'Máquina', ''),
  ('Aducción de cadera en polea', 'aislado_por_musculo', 'Aductores', 'Aductores', 'Aducción de cadera', 'Polea', ''),
  ('Aducción acostado de lado', 'aislado_por_musculo', 'Aductores', 'Aductores', 'Aducción de cadera', 'Peso corporal o tobilleras', ''),
  ('Copenhagen plank asistido', 'aislado_por_musculo', 'Aductores', 'Aductores', 'Estabilidad aductora', 'Banco o soporte', ''),
  ('Aducción con banda', 'aislado_por_musculo', 'Aductores', 'Aductor largo', 'Aducción de cadera', 'Banda', ''),
  ('Apretón de balón entre rodillas', 'aislado_por_musculo', 'Aductores', 'Aductor mayor', 'Aducción de cadera', 'Balón o bloque', ''),
  ('Máquina de abductores', 'aislado_por_musculo', 'Abductores', 'Abductores', 'Abducción de cadera', 'Máquina', ''),
  ('Monster walk', 'aislado_por_musculo', 'Abductores', 'Glúteo medio', 'Abducción de cadera', 'Banda', ''),
  ('Abducción de cadera en polea', 'aislado_por_musculo', 'Abductores', 'Tensor de la fascia lata', 'Abducción de cadera', 'Polea', ''),
  ('Fire hydrants', 'aislado_por_musculo', 'Abductores', 'Estabilizadores de cadera', 'Abducción de cadera', 'Banda o peso corporal', ''),
  ('Elevación de talones de pie', 'aislado_por_musculo', 'Pantorrillas', 'Gastrocnemio', 'Flexión plantar', 'Máquina, barra o step', ''),
  ('Elevación de talones en máquina', 'aislado_por_musculo', 'Pantorrillas', 'Gastrocnemio', 'Flexión plantar', 'Máquina', ''),
  ('Elevación de talones en prensa', 'aislado_por_musculo', 'Pantorrillas', 'Gastrocnemio', 'Flexión plantar', 'Prensa', ''),
  ('Elevación de talones sentado', 'aislado_por_musculo', 'Pantorrillas', 'Sóleo', 'Flexión plantar', 'Máquina o barra', ''),
  ('Elevación de talones con rodillas flexionadas', 'aislado_por_musculo', 'Pantorrillas', 'Sóleo', 'Flexión plantar', 'Mancuernas, barra o máquina', ''),
  ('Elevación de punta de pies', 'aislado_por_musculo', 'Pantorrillas', 'Tibial anterior', 'Dorsiflexión', 'Peso corporal o banda', ''),
  ('Tibialis raise contra pared', 'aislado_por_musculo', 'Pantorrillas', 'Tibial anterior', 'Dorsiflexión', 'Pared', ''),
  ('Crunch abdominal', 'aislado_por_musculo', 'Abdomen', 'Recto abdominal', 'Flexión de tronco', 'Peso corporal', ''),
  ('Crunch en máquina', 'aislado_por_musculo', 'Abdomen', 'Recto abdominal', 'Flexión de tronco', 'Máquina', ''),
  ('Crunch en polea', 'aislado_por_musculo', 'Abdomen', 'Recto abdominal', 'Flexión de tronco', 'Polea', ''),
  ('Elevación de piernas', 'aislado_por_musculo', 'Abdomen', 'Recto abdominal inferior', 'Elevación de piernas', 'Barra, banco o suelo', ''),
  ('Reverse crunch', 'aislado_por_musculo', 'Abdomen', 'Recto abdominal inferior', 'Flexión de tronco', 'Peso corporal', ''),
  ('Crunch lateral', 'aislado_por_musculo', 'Abdomen', 'Oblicuos', 'Flexión lateral', 'Peso corporal', ''),
  ('Rotación en polea', 'aislado_por_musculo', 'Abdomen', 'Oblicuos', 'Rotación', 'Polea', ''),
  ('Russian twist controlado', 'aislado_por_musculo', 'Abdomen', 'Oblicuos', 'Rotación', 'Peso corporal, balón o disco', ''),
  ('Dead bug', 'aislado_por_musculo', 'Abdomen', 'Transverso abdominal', 'Anti-extensión', 'Peso corporal', ''),
  ('Hollow hold', 'aislado_por_musculo', 'Abdomen', 'Transverso abdominal', 'Isometría', 'Peso corporal', ''),
  ('Plancha frontal', 'aislado_por_musculo', 'Abdomen', 'Transverso abdominal', 'Isometría', 'Peso corporal', ''),
  ('Extensión lumbar', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Erectores espinales', 'Extensión lumbar', 'Banco romano o suelo', ''),
  ('Superman', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Erectores espinales', 'Extensión lumbar', 'Peso corporal', ''),
  ('Plancha lateral', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Cuadrado lumbar', 'Anti-flexión lateral', 'Peso corporal', ''),
  ('Side bend con mancuerna', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Cuadrado lumbar', 'Flexión lateral', 'Mancuerna', ''),
  ('Bird dog', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Core profundo', 'Estabilidad lumbopélvica', 'Peso corporal', ''),
  ('Pallof press', 'aislado_por_musculo', 'Lumbar y estabilizadores', 'Core profundo', 'Anti-rotación', 'Polea o banda', ''),
  ('SkiErg', 'hyrox_oficial', 'Ergómetro', 'Espalda, brazos, core, resistencia cardiovascular', 'Condicionamiento cíclico', 'SkiErg', ''),
  ('Sled Push / Empuje de trineo', 'hyrox_oficial', 'HYROX oficial', 'Cuádriceps, glúteos, pantorrillas, potencia de piernas', 'Empuje horizontal', 'Trineo', ''),
  ('Sled Pull / Jalón de trineo', 'hyrox_oficial', 'HYROX oficial', 'Espalda, bíceps, glúteos, piernas, agarre', 'Jalón horizontal', 'Trineo y cuerda', ''),
  ('Burpee Broad Jump', 'hyrox_oficial', 'HYROX oficial', 'Pecho, hombros, piernas, core, resistencia', 'Burpee + salto horizontal', 'Peso corporal', ''),
  ('Rowing / Remo ergómetro', 'hyrox_oficial', 'Ergómetro', 'Espalda, piernas, brazos, cardio', 'Condicionamiento cíclico', 'Remo ergómetro', ''),
  ('Farmers Carry / Caminata del granjero', 'hyrox_oficial', 'Carry', 'Agarre, trapecio, core, piernas', 'Carry', 'Mancuernas o kettlebells', ''),
  ('Sandbag Lunges / Zancadas con saco', 'hyrox_oficial', 'HYROX oficial', 'Glúteos, cuádriceps, isquiotibiales, core', 'Zancada', 'Sandbag', ''),
  ('Wall Balls', 'hyrox_oficial', 'HYROX oficial', 'Piernas, glúteos, hombros, tríceps, cardio', 'Sentadilla + lanzamiento', 'Balón medicinal y target', '');

insert into programming_exercises (
  name,
  family,
  category,
  primary_muscle,
  movement_pattern,
  equipment,
  coaching_notes,
  is_active
)
select
  name,
  family,
  category,
  primary_muscle,
  movement_pattern,
  equipment,
  coaching_notes,
  true
from programming_exercise_seed
on conflict (name) do update
set
  family = excluded.family,
  category = excluded.category,
  primary_muscle = excluded.primary_muscle,
  movement_pattern = excluded.movement_pattern,
  equipment = excluded.equipment,
  coaching_notes = excluded.coaching_notes,
  is_active = true,
  updated_at = now();

update programming_exercises
set
  is_active = false,
  updated_at = now()
where name = any (
  array[
    'Back Squat',
    'Front Squat',
    'Deadlift',
    'Romanian Deadlift',
    'Walking Lunge',
    'Bulgarian Split Squat',
    'Hip Thrust',
    'Bench Press',
    'Push Press',
    'Strict Press',
    'Pull-Up',
    'Bent Over Row',
    'Ring Row',
    'Thruster',
    'Biceps Curl',
    'Triceps Extension',
    'Lateral Raise',
    'Leg Extension',
    'Leg Curl',
    'Calf Raise',
    'Sled Push',
    'Sled Pull',
    'Row',
    'Farmers Carry',
    'Sandbag Lunges'
  ]
);
