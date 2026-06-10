import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const feesClient = axios.create({
  baseURL: `${API_BASE}/api/part-time-fees`,
  headers: { "Content-Type": "application/json" }
});

feesClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("atiToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

feesClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || "Request failed";
    if (status === 401) {
      localStorage.removeItem("atiUser");
      localStorage.removeItem("atiToken");
      window.dispatchEvent(new Event("ati-auth-cleared"));
      throw new Error("Please log in again to continue.");
    }
    throw new Error(message);
  }
);

const unwrap = (request) => request.then((response) => response.data);

export const feesApi = {
  dashboard: (params) => unwrap(feesClient.get("/dashboard", { params })),
  students: (params) => unwrap(feesClient.get("/students", { params })),
  studentFees: (params) => unwrap(feesClient.get("/student-fees", { params })),
  feeSummary: (studentId) => unwrap(feesClient.get(studentId ? `/students/${studentId}/summary` : "/my-summary")),
  createStudentFee: (payload) => unwrap(feesClient.post("/student-fees", payload)),
  updateStudentFee: (id, payload) => unwrap(feesClient.put(`/student-fees/${id}`, payload)),
  deleteStudentFee: (id) => unwrap(feesClient.delete(`/student-fees/${id}`)),
  categories: () => unwrap(feesClient.get("/fee-categories")),
  createCategory: (payload) => unwrap(feesClient.post("/fee-categories", payload)),
  structures: (params) => unwrap(feesClient.get("/fee-structures", { params })),
  createStructure: (payload) => unwrap(feesClient.post("/fee-structures", payload)),
  updateStructure: (id, payload) => unwrap(feesClient.put(`/fee-structures/${id}`, payload)),
  invoices: (params) => unwrap(feesClient.get("/invoices", { params })),
  generateInvoice: (payload) => unwrap(feesClient.post("/invoices", payload)),
  payments: (params) => unwrap(feesClient.get("/payments", { params })),
  recordPayment: (payload) => unwrap(feesClient.post("/payments", payload)),
  outstanding: (params) => unwrap(feesClient.get("/outstanding", { params })),
  receipts: (params) => unwrap(feesClient.get("/receipts", { params })),
  refunds: (params) => unwrap(feesClient.get("/refunds", { params })),
  submitRefund: (payload) => unwrap(feesClient.post("/refunds", payload)),
  reviewRefund: (id, payload) => unwrap(feesClient.patch(`/refunds/${id}/review`, payload)),
  notifications: (params) => unwrap(feesClient.get("/notifications", { params })),
  createNotification: (payload) => unwrap(feesClient.post("/notifications", payload)),
  serviceRequests: (params) => unwrap(feesClient.get("/service-requests", { params })),
  createServiceRequest: (payload) => unwrap(feesClient.post("/service-requests", payload)),
  reviewServiceRequest: (id, payload) => unwrap(feesClient.patch(`/service-requests/${id}/review`, payload)),
  report: (type, params) => unwrap(feesClient.get(`/reports/${type}`, { params }))
};

export function downloadFeeFile(path, filename) {
  return feesClient.get(path, { responseType: "blob" }).then((response) => {
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  });
}
