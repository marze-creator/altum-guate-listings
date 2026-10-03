-- La cola pg_net solo confirma que el webhook fue encolado, no que Meta publicó.
-- Mantener content_posts en LISTO hasta que n8n reciba un ID real de Facebook/Instagram.

create or replace function public.publish_content_now(
  p_content_id uuid,
  p_networks text[] default array['facebook'::text,'instagram'::text]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_content record;
  v_prop record;
  v_photos jsonb;
  v_payload jsonb;
  v_networks text[];
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'::public.app_role
  ) then
    raise exception 'admin_required';
  end if;

  v_networks := array(
    select distinct lower(x)
    from unnest(coalesce(p_networks, array[]::text[])) x
    where lower(x) in ('facebook','instagram')
  );

  if coalesce(array_length(v_networks,1),0) = 0 then
    raise exception 'network_required';
  end if;

  select * into v_content
  from public.property_content
  where id = p_content_id and status = 'aprobado'
  limit 1;

  if not found then raise exception 'approved_content_not_found'; end if;

  select p.* into v_prop
  from public.properties p
  where p.id = v_content.property_id;

  if not found then raise exception 'property_not_found'; end if;

  select coalesce(jsonb_agg(pi.url order by pi.position), '[]'::jsonb)
  into v_photos
  from public.property_images pi
  where pi.property_id = v_content.property_id;

  v_payload := jsonb_build_object(
    'content_id', v_content.id,
    'property_id', v_content.property_id,
    'title', v_prop.title,
    'price', v_prop.price,
    'currency', v_prop.currency,
    'zone', v_prop.zone,
    'city', v_prop.city,
    'operation', v_prop.operation,
    'bedrooms', v_prop.bedrooms,
    'bathrooms', v_prop.bathrooms,
    'area_m2', v_prop.area_m2,
    'cover_image', v_prop.cover_image,
    'photos', v_photos,
    'post_facebook_instagram', v_content.post_facebook_instagram,
    'networks', to_jsonb(v_networks)
  );

  perform net.http_post(
    url := 'https://altum-n8n.ca-1.instapods.app/webhook/altum-publicar-meta',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := v_payload
  );

  update public.content_posts
  set status = 'listo',
      scheduled_at = coalesce(scheduled_at, now())
  where content_id = p_content_id
    and lower(network::text) = any(v_networks);

  return jsonb_build_object(
    'ok', true,
    'queued', true,
    'networks', v_networks,
    'status', 'listo_hasta_confirmacion_meta'
  );
end;
$function$;
