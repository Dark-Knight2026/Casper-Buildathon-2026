import { describe, it, expect, vi, beforeEach } from 'vitest';

// `backendClient` is the only seam between applicationService and the network.
// Mocked at the module level so each test just sets return values, not network
// plumbing — same pattern as userProfileService.test.ts.
const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const putMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  backendClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
  ApiError: class ApiError extends Error {},
}));

// Mimics a backend 4xx the way ApiClient surfaces it (statusCode-carrying error).
const httpError = (statusCode: number) =>
  Object.assign(new Error('HTTP error'), { statusCode });

import {
  submitApplication,
  getMyApplications,
  getListingApplications,
  getLandlordApplications,
  getApplication,
  reviewApplication,
  getApplicationNotes,
  addApplicationNote,
  requestBackgroundCheck,
  getBackgroundChecks,
  getApplicationScore,
  updateDraftApplication,
  submitDraftApplication,
} from '@/services/applicationService';
import type {
  SubmitApplicationBody,
  ReviewableStatus,
} from '@/types/applicationContract';

const APPLICATIONS = '/api/v1/applications';
const LISTINGS = '/api/v1/listings';

// A minimal-but-complete submit body; the service must forward it verbatim.
const BODY: SubmitApplicationBody = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  dateOfBirth: '1990-01-01',
  currentAddress: '1 Main St',
  currentCity: 'Austin',
  currentState: 'TX',
  currentZip: '78701',
  moveInDate: '2026-08-01',
  employer: 'Acme',
  jobTitle: 'Engineer',
  employmentLength: '3 years',
  monthlyIncome: 9000,
  reference1Name: 'Sam Ref',
  reference1Phone: '555-0101',
  pets: false,
  backgroundCheckConsent: true,
  asDraft: false,
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  putMock.mockReset();
});

describe('submitApplication', () => {
  it('POSTs /listings/{id}/applications with the body verbatim and passes the response through', async () => {
    const server = { id: 'app-1', status: 'pending' };
    postMock.mockResolvedValueOnce(server);

    const result = await submitApplication('listing-9', BODY);

    expect(postMock).toHaveBeenCalledWith(
      `${LISTINGS}/listing-9/applications`,
      BODY
    );
    expect(result, 'service is a thin pass-through, no remapping').toBe(server);
  });
});

describe('getMyApplications', () => {
  it('GETs /applications with no query string when no params are given', async () => {
    getMock.mockResolvedValueOnce({ data: [], itemCount: 0, pageCount: 0 });
    await getMyApplications();
    expect(getMock).toHaveBeenCalledWith(APPLICATIONS);
  });

  it('appends pagination params as a query string', async () => {
    getMock.mockResolvedValueOnce({ data: [], itemCount: 0, pageCount: 0 });
    await getMyApplications({ page: 2, pageSize: 10 });
    expect(getMock).toHaveBeenCalledWith(`${APPLICATIONS}?page=2&pageSize=10`);
  });
});

describe('getListingApplications', () => {
  it('GETs /listings/{id}/applications (no query string when empty)', async () => {
    getMock.mockResolvedValueOnce({ data: [], itemCount: 0, pageCount: 0 });
    await getListingApplications('listing-3');
    expect(getMock).toHaveBeenCalledWith(`${LISTINGS}/listing-3/applications`);
  });
});

describe('getLandlordApplications', () => {
  it('GETs /applications/landlord and forwards filters as query params', async () => {
    getMock.mockResolvedValueOnce({ data: [], itemCount: 0, pageCount: 0 });
    await getLandlordApplications({ status: 'pending', page: 1 });
    expect(getMock).toHaveBeenCalledWith(
      `${APPLICATIONS}/landlord?status=pending&page=1`
    );
  });

  it('omits the query string entirely when no filters are passed', async () => {
    getMock.mockResolvedValueOnce({ data: [], itemCount: 0, pageCount: 0 });
    await getLandlordApplications();
    expect(getMock).toHaveBeenCalledWith(`${APPLICATIONS}/landlord`);
  });
});

describe('getApplication', () => {
  it('GETs /applications/{id}', async () => {
    const server = { id: 'app-7' };
    getMock.mockResolvedValueOnce(server);
    const result = await getApplication('app-7');
    expect(getMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-7`);
    expect(result).toBe(server);
  });
});

describe('reviewApplication (state-machine transitions)', () => {
  it.each<ReviewableStatus>([
    'under_review',
    'conditional',
    'approved',
    'rejected',
  ])('PUTs /applications/{id}/status with { status: %s }', async (status) => {
    putMock.mockResolvedValueOnce({ id: 'app-2', status });
    const result = await reviewApplication('app-2', status);
    expect(putMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-2/status`, {
      status,
    });
    expect(result).toEqual({ id: 'app-2', status });
  });

  it('propagates a 409 the backend raises for an illegal transition (does not swallow)', async () => {
    putMock.mockRejectedValueOnce(httpError(409));
    await expect(reviewApplication('app-2', 'approved')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('notes', () => {
  it('GETs /applications/{id}/notes', async () => {
    getMock.mockResolvedValueOnce([]);
    await getApplicationNotes('app-1');
    expect(getMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-1/notes`);
  });

  it('POSTs /applications/{id}/notes wrapping the text as { body }', async () => {
    postMock.mockResolvedValueOnce({ id: 'note-1' });
    await addApplicationNote('app-1', 'Looks solid');
    expect(postMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-1/notes`, {
      body: 'Looks solid',
    });
  });
});

describe('background checks', () => {
  it('POSTs /applications/{id}/background-checks wrapping the type as { checkType }', async () => {
    postMock.mockResolvedValueOnce({ id: 'bg-1' });
    await requestBackgroundCheck('app-1', 'credit');
    expect(postMock).toHaveBeenCalledWith(
      `${APPLICATIONS}/app-1/background-checks`,
      { checkType: 'credit' }
    );
  });

  it('GETs /applications/{id}/background-checks', async () => {
    getMock.mockResolvedValueOnce([]);
    await getBackgroundChecks('app-1');
    expect(getMock).toHaveBeenCalledWith(
      `${APPLICATIONS}/app-1/background-checks`
    );
  });
});

describe('getApplicationScore', () => {
  it('GETs /applications/{id}/score', async () => {
    getMock.mockResolvedValueOnce({ total: 80, factors: [] });
    await getApplicationScore('app-1');
    expect(getMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-1/score`);
  });
});

describe('draft lifecycle', () => {
  it('PATCHes /applications/{id} with the body for an edit', async () => {
    patchMock.mockResolvedValueOnce({ id: 'app-1', status: 'draft' });
    await updateDraftApplication('app-1', BODY);
    expect(patchMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-1`, BODY);
  });

  it('POSTs /applications/{id}/submit (no body) to finalise a draft', async () => {
    postMock.mockResolvedValueOnce({ id: 'app-1', status: 'pending' });
    await submitDraftApplication('app-1');
    expect(postMock).toHaveBeenCalledWith(`${APPLICATIONS}/app-1/submit`);
  });

  it('propagates a 409 when submitting a non-draft application', async () => {
    postMock.mockRejectedValueOnce(httpError(409));
    await expect(submitDraftApplication('app-1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
