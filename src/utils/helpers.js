export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

export const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

export const formatSurface = (m2) => {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${parseFloat(m2 || 0).toFixed(0)} m²`;
};

export const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(coordinates[i].latitude);
    const lat2 = toRad(coordinates[j].latitude);
    const lon1 = toRad(coordinates[i].longitude);
    const lon2 = toRad(coordinates[j].longitude);
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((area * R * R) / 2);
};

export const getPolygonCenter = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  const lat = coordinates.reduce((s, c) => s + c.latitude, 0) / coordinates.length;
  const lng = coordinates.reduce((s, c) => s + c.longitude, 0) / coordinates.length;
  return { latitude: lat, longitude: lng };
};

// ─── Payment helpers ──────────────────────────────────────────────────────────

// Total amount paid for a job (supports both legacy `paid` boolean and new payments array)
export const getAmountPaid = (job) => {
  if (job.payments && job.payments.length > 0) {
    return job.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  }
  // Backward compat: old jobs with paid=true → fully paid
  return job.paid ? parseFloat(job.totalPrice || 0) : 0;
};

export const getRemainingAmount = (job) =>
  Math.max(0, parseFloat(job.totalPrice || 0) - getAmountPaid(job));

// 'unpaid' | 'partial' | 'paid'
export const getPaymentStatus = (job) => {
  const paid = getAmountPaid(job);
  const total = parseFloat(job.totalPrice || 0);
  if (paid <= 0.001) return 'unpaid';
  if (paid >= total - 0.001) return 'paid';
  return 'partial';
};

export const isFullyPaid = (job) => getPaymentStatus(job) === 'paid';

// ─── Client grouping ──────────────────────────────────────────────────────────

export const groupByClient = (jobs) => {
  const map = {};
  jobs.forEach((job) => {
    const name = job.clientName || 'Unknown';
    if (!map[name]) map[name] = { name, jobs: [], totalAmount: 0, paidAmount: 0 };
    map[name].jobs.push(job);
    map[name].totalAmount += parseFloat(job.totalPrice || 0);
    map[name].paidAmount += getAmountPaid(job);
  });
  return Object.values(map);
};
