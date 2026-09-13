-- Named read-only queries used by the service/CLI.
SELECT * FROM v_build_tokenomics WHERE tenant_id = :tenant_id;
SELECT * FROM v_model_tokenomics WHERE tenant_id = :tenant_id;
SELECT * FROM v_money_summary WHERE tenant_id = :tenant_id;
SELECT * FROM v_trial_balance WHERE tenant_id = :tenant_id;
