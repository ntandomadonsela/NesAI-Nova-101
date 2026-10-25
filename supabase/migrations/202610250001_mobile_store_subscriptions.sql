ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS store_product_id TEXT,
  ADD COLUMN IF NOT EXISTS store_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS store_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS store_last_notification_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_store_transaction_id_key
  ON public.subscriptions (store_transaction_id)
  WHERE store_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_store_purchase_token_key
  ON public.subscriptions (store_purchase_token)
  WHERE store_purchase_token IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.store_purchase_token IS
  'SHA-256 hash of the Google Play purchase token for ownership checks; raw token is never stored.';
