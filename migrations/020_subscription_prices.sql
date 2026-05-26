-- Seed default subscription prices into system_settings.
INSERT INTO system_settings (key, value)
VALUES
    ('subscription_price_monthly',  '9.99'),
    ('subscription_price_yearly',   '49.99'),
    ('subscription_price_lifetime', '149.99')
ON CONFLICT (key) DO NOTHING;
