/**
 * CSPR Cloud API Types
 * Shared response shapes for CSPR.Cloud REST API endpoints.
 */

export interface FTTokenAction {
  deploy_hash: string;
  block_height: number | null;
  timestamp: string;
  amount: string;
  contract_package_hash: string;
  from_hash: string | null;
  from_type: number | null; // 0 = account, 1 = contract package
  to_hash: string | null;
  to_type: number | null;
  ft_action_type_id: number;
  transform_idx: number;
}

export interface FTTokenActionsResponse {
  item_count: number;
  page_count: number;
  data: FTTokenAction[];
}
