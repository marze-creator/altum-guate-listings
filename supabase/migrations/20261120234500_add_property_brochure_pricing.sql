-- Precio comercial exclusivo para cotizaciones PDF.
-- No modifica el precio público de la propiedad.

alter table public.properties
  add column if not exists brochure_price numeric,
  add column if not exists brochure_discount numeric not null default 0;

comment on column public.properties.brochure_price is
  'Precio base usado exclusivamente en la cotización/PDF comercial. Si es null usa properties.price.';

comment on column public.properties.brochure_discount is
  'Descuento aplicado a la cotización/PDF comercial. No modifica el precio publicado.';
