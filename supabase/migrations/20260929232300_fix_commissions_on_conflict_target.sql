-- Fix automático de comisión al mover una oportunidad a Cierre / Ganado.
-- El trigger sync_commission_from_won_deal usa:
-- ON CONFLICT (deal_id, advisor_user_id)
-- por lo que Postgres requiere una restricción/índice UNIQUE exactamente sobre esas columnas.

drop index if exists public.commissions_deal_advisor_unique;

create unique index commissions_deal_advisor_unique
on public.commissions (deal_id, advisor_user_id);
