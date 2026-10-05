-- Dashboard metrics: real channel attribution and commission totals from won deals only.
create or replace function public.get_dashboard_metrics()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid := user_organization_id(auth.uid());
  v_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
  v_leads jsonb;
  v_props jsonb;
  v_deals jsonb;
  v_comm jsonb;
  v_content jsonb;
begin
  select jsonb_build_object(
    'total', count(*),
    'calientes', count(*) filter (where temperature = 'caliente'),
    'tibios', count(*) filter (where temperature = 'tibio'),
    'frios', count(*) filter (where temperature = 'frio'),
    'nuevos_semana', count(*) filter (where created_at >= now() - interval '7 days'),
    'seguimientos_vencidos', count(*) filter (where next_follow_up_at is not null and next_follow_up_at < now()),
    'de_whatsapp', count(*) filter (where source = 'whatsapp'),
    'de_web', count(*) filter (where source in ('web', 'web-chat')),
    'de_web_chat', count(*) filter (where source = 'web-chat'),
    'de_meta', count(*) filter (where source in ('facebook_lead_ads', 'facebook', 'instagram', 'meta_ad')),
    'manuales', count(*) filter (where source = 'manual'),
    'otros', count(*) filter (
      where source is null
         or source not in ('whatsapp','web','web-chat','facebook_lead_ads','facebook','instagram','meta_ad','manual')
    )
  ) into v_leads
  from leads
  where organization_id = v_org and (v_is_admin or assigned_to_user_id = v_uid);

  select jsonb_build_object(
    'total', count(*),
    'publicadas', count(*) filter (where status = 'published'),
    'borradores', count(*) filter (where status = 'draft'),
    'contenido_pendiente', count(*) filter (where content_status = 'pendiente'),
    'contenido_generado', count(*) filter (where content_status = 'generado')
  ) into v_props
  from properties
  where organization_id = v_org and (v_is_admin or captured_by_user_id = v_uid);

  select jsonb_build_object(
    'total', count(*),
    'abiertos', count(*) filter (where status = 'abierto'),
    'ganados', count(*) filter (where status = 'ganado'),
    'perdidos', count(*) filter (where status = 'perdido'),
    'valor_pipeline', coalesce(sum(deal_value) filter (where status = 'abierto'), 0),
    'comision_potencial', coalesce(sum(commission_advisor) filter (where status = 'abierto'), 0)
  ) into v_deals
  from deals
  where organization_id = v_org
    and (v_is_admin or assigned_to_user_id = v_uid or captured_by_user_id = v_uid or closed_by_user_id = v_uid);

  select jsonb_build_object(
    'total_potencial', coalesce(sum(c.amount), 0)
  ) into v_comm
  from commissions c
  join deals d on d.id = c.deal_id and d.status = 'ganado'
  where c.organization_id = v_org and (v_is_admin or c.advisor_user_id = v_uid);

  select jsonb_build_object(
    'por_aprobar', count(*) filter (where status = 'borrador')
  ) into v_content
  from property_content
  where organization_id = v_org;

  return jsonb_build_object(
    'es_admin', v_is_admin,
    'leads', coalesce(v_leads, '{}'::jsonb),
    'propiedades', coalesce(v_props, '{}'::jsonb),
    'pipeline', coalesce(v_deals, '{}'::jsonb),
    'comisiones', coalesce(v_comm, '{}'::jsonb),
    'contenido', coalesce(v_content, '{}'::jsonb)
  );
end;
$function$;
