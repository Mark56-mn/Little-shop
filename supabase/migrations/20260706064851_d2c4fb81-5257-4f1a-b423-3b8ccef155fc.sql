
CREATE OR REPLACE FUNCTION public.settle_paid_order(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  earn INTEGER;
  redeem INTEGER;
  bal INTEGER;
  paid_count INTEGER;
  ref_id UUID;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR o.points_awarded THEN RETURN; END IF;

  -- Always mark settled to keep this idempotent
  UPDATE public.orders SET points_awarded = true WHERE id = _order_id;

  IF o.user_id IS NULL THEN RETURN; END IF;

  -- Redeem points the customer applied (bounded by their current balance)
  IF o.points_redeemed > 0 THEN
    SELECT points_balance INTO bal FROM public.profiles WHERE id = o.user_id;
    redeem := LEAST(o.points_redeemed, COALESCE(bal, 0));
    IF redeem > 0 THEN
      UPDATE public.profiles SET points_balance = points_balance - redeem WHERE id = o.user_id;
      INSERT INTO public.point_transactions (user_id, points, reason, order_id)
      VALUES (o.user_id, -redeem, 'Redeemed at checkout', _order_id);
    END IF;
  END IF;

  -- Earn points for the purchase: 1 per 100 NGN + 50 flat
  earn := floor(o.total_amount / 100)::int + 50;
  UPDATE public.profiles SET points_balance = points_balance + earn WHERE id = o.user_id;
  INSERT INTO public.point_transactions (user_id, points, reason, order_id)
  VALUES (o.user_id, earn, 'Purchase reward', _order_id);

  -- Referral first-purchase bonus for the referrer
  SELECT count(*) INTO paid_count FROM public.orders
    WHERE user_id = o.user_id AND payment_status = 'paid';
  SELECT referred_by INTO ref_id FROM public.profiles WHERE id = o.user_id;
  IF paid_count <= 1 AND ref_id IS NOT NULL THEN
    UPDATE public.profiles SET points_balance = points_balance + 500 WHERE id = ref_id;
    INSERT INTO public.point_transactions (user_id, points, reason, order_id)
    VALUES (ref_id, 500, 'Referred friend made first purchase', _order_id);
  END IF;
END;
$$;
