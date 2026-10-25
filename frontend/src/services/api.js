// src/services/api.js
// All calls to the PHP backend live here.

export const API_BASE = `http://${window.location.hostname}:8000/api`;

export class ApiError extends Error {
  constructor(message, status = 0, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(
  path,
  { method = 'GET', body, skipSessionCheck = false } = {}
) {
  let response;

  try {
    response = await fetch(API_BASE + path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Cannot reach the server. Check that the PHP server is running on port 8000 and MySQL is started.'
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Response was not JSON.
  }

  if (!response.ok || !data || data.success === false) {
    if (response.status === 401 && !skipSessionCheck) {
      window.dispatchEvent(new Event('session-expired'));
    }

    throw new ApiError(
      (data && data.message) || 'Unexpected server response.',
      response.status,
      (data && data.errors) || {}
    );
  }

  return data;
}

const toQuery = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const api = {
  // Authentication
  me: () =>
    request('/me.php', { skipSessionCheck: true }),

  login: (email, password) =>
    request('/login.php', {
      method: 'POST',
      body: { email, password },
      skipSessionCheck: true,
    }),

  managerLogin: (email, password) =>
    request('/manager_login.php', {
      method: 'POST',
      body: { email, password },
      skipSessionCheck: true,
    }),

  register: (form) =>
    request('/register.php', {
      method: 'POST',
      body: form,
      skipSessionCheck: true,
    }),

  logout: () =>
    request('/logout.php', {
      method: 'POST',
      body: {},
      skipSessionCheck: true,
    }),

  // Customer operations
  dashboard: () =>
    request('/dashboard.php'),

  deposit: (amount, description) =>
    request('/deposit.php', {
      method: 'POST',
      body: { amount, description },
    }),

  withdraw: (amount, description) =>
    request('/withdraw.php', {
      method: 'POST',
      body: { amount, description },
    }),

  transfer: (receiver_account_number, amount, description) =>
    request('/transfer.php', {
      method: 'POST',
      body: { receiver_account_number, amount, description },
    }),

  transactions: (filters = {}) =>
    request('/transactions.php' + toQuery(filters)),

  // Manager operations
  pendingApprovals: () =>
    request('/approvals_pending.php'),

  approvalHistory: () =>
    request('/approvals_history.php'),

  decideApproval: (approval_id, decision, remarks) =>
    request('/approval_decide.php', {
      method: 'POST',
      body: { approval_id, decision, remarks },
    }),

  // Customer management: View
  customers: () =>
    request('/customers.php'),

  // Customer management: Insert
  createCustomer: (data) =>
    request('/customers.php', {
      method: 'POST',
      body: { ...data, action: 'create' },
    }),

  // Customer management: Update
  updateCustomer: (data) =>
    request('/customers.php', {
      method: 'POST',
      body: { ...data, action: 'update' },
    }),

  // Customer management: Delete
  deleteCustomer: (customer_id) =>
    request('/customers.php', {
      method: 'POST',
      body: { customer_id, action: 'delete' },
    }),
};
