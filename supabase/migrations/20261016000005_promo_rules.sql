-- ═══════════════════════════════════════════════════════════════
-- Cedarline · 0005 · promo rule in check_promo's answer
-- ───────────────────────────────────────────────────────────────
-- The cart recalculates the discount as the shopper changes
-- quantities, so a valid code now also returns its rule (kind,
-- percent or amount off, minimum subtotal). The code itself still
-- has to be known; nothing else about promotions is exposed, and
-- place_order applies the rule again on the server.
-- Also computes the percentage in numeric, so very large subtotals
-- can't overflow. Safe to re-run (create or replace; grants are kept).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.promo_discount(p_code text, p_subtotal_cents integer)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  p public.promotions;
begin
  if v_code = '' then
    return jsonb_build_object('valid', false, 'error', 'Enter a promo code.');
  end if;
  select * into p from public.promotions
   where code = v_code and is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now())
     and (usage_limit is null or times_used < usage_limit);
  if not found then
    return jsonb_build_object('valid', false, 'error', 'That code isn’t valid.');
  end if;
  if p_subtotal_cents < p.min_subtotal_cents then
    return jsonb_build_object('valid', false,
      'error', format('This code needs a subtotal of at least $%s.', trim(to_char(p.min_subtotal_cents / 100.0, 'FM999999990.00'))));
  end if;
  return jsonb_build_object(
    'valid', true, 'code', p.code, 'label', p.label,
    'discount_cents', case p.kind
                        when 'percent' then round(p_subtotal_cents::numeric * p.percent_off / 100.0)::integer
                        else least(p_subtotal_cents, p.amount_off_cents) end,
    'kind', p.kind,
    'percentOff', p.percent_off,
    'amountOff', round(p.amount_off_cents / 100.0, 2),
    'minSubtotal', round(p.min_subtotal_cents / 100.0, 2));
end $$;

revoke execute on function public.promo_discount(text, integer) from public, anon, authenticated;
