import { useQuery } from '@tanstack/react-query';

const PACKAGE_HASH_RAW = (import.meta.env.VITE_ICO_PACKAGE_HASH || '').replace('hash-', '');

const STALE_TIME = 30 * 60 * 1000; // 30 minutes

export interface DeployArgs {
  amount_to_spend?: { cl_type: string; parsed: string };
  currency?: { cl_type: string; parsed: number };
}

export interface ContractDeploy {
  deploy_hash: string;
  block_height: number;
  timestamp: string;
  caller_public_key: string;
  args: DeployArgs;
  cost: string;
  consumed_gas: string;
  status: string;
  error_message: string | null;
  contract_package_hash: string;
}

interface DeploysResponse {
  item_count: number;
  page_count: number;
  data: ContractDeploy[];
}

async function fetchContractDeploys(page: number, pageSize: number): Promise<DeploysResponse> {
  const url = `/api/cspr-cloud/deploys?contract_package_hash=${PACKAGE_HASH_RAW}&page=${page}&page_size=${pageSize}`;

  const res = await fetch(url, {
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CSPR.cloud API error: ${res.status}`);
  }

  return res.json();
}

export function useContractDeploys(page = 1, pageSize = 10) {
  const query = useQuery({
    queryKey: ['contract-deploys', page, pageSize],
    queryFn: () => fetchContractDeploys(page, pageSize),
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
    enabled: !!PACKAGE_HASH_RAW,
  });

  return {
    deploys: query.data?.data ?? [],
    totalPages: query.data?.page_count ?? 0,
    totalItems: query.data?.item_count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
