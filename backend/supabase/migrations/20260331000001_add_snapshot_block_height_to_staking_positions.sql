ALTER TABLE staking_positions
    ADD COLUMN snapshot_block_height BIGINT DEFAULT NULL;

COMMENT ON COLUMN staking_positions.snapshot_block_height
    IS 'Block height of the last applied StakerSnapshot event. Used as a monotonicity guard to prevent out-of-order events from overwriting newer reward state.';
