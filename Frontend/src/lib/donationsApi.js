import { apiFetch } from "./api";

export const donationsApi = {
  campaigns: () => apiFetch("/api/donations/public/campaigns"),
  wall: () => apiFetch("/api/donations/public/wall"),
  createSession: (payload) => apiFetch("/api/donations/public/session", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  verifyPayment: (payload) => apiFetch("/api/donations/public/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  receipt: (donationId) => apiFetch(`/api/donations/public/receipt/${encodeURIComponent(donationId)}`),
  dashboard: () => apiFetch("/api/donations/admin/dashboard"),
  list: (params = {}) => apiFetch(`/api/donations/admin/list?${new URLSearchParams(params).toString()}`),
  reports: (params = {}) => apiFetch(`/api/donations/admin/reports?${new URLSearchParams(params).toString()}`),
  adminCampaigns: () => apiFetch("/api/donations/admin/campaigns"),
  createCampaign: (payload) => apiFetch("/api/donations/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  uploadCampaignImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiFetch("/api/donations/admin/uploads", {
      method: "POST",
      body: formData
    });
  },
  updateCampaign: (id, payload) => apiFetch(`/api/donations/admin/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  settings: () => apiFetch("/api/donations/admin/settings")
};
