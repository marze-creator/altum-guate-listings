-- Mantiene la comisión sincronizada si cambia el precio final de un negocio ganado.
-- El trigger existente ya recalcula la comisión cuando cambian asesores/estado;
-- agregamos deal_value para que una corrección del precio de cierre actualice commissions.

drop trigger if exists trg_sync_commission_from_won_deal on public.deals;

create trigger trg_sync_commission_from_won_deal
after insert or update of
  status,
  deal_value,
  commission_captured_advisor,
  commission_closing_advisor,
  captured_by_user_id,
  closed_by_user_id,
  assigned_to_user_id,
  property_id,
  currency
on public.deals
for each row
execute function public.sync_commission_from_won_deal();
