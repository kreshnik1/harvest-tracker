import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getJobs, saveJob, updateJob, deleteJob, getFields, saveField, deleteField } from '../utils/storage';
import { useAuth } from './AuthContext';
import { getAmountPaid, getRemainingAmount, getPaymentStatus, generateId } from '../utils/helpers';

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [fields, setFields] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    const data = await getJobs(user.id);
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setJobs(data);
    setLoaded(true);
  }, [user]);

  const loadFields = useCallback(async () => {
    if (!user) return;
    const data = await getFields(user.id);
    setFields(data);
  }, [user]);

  const addField = useCallback(async (field) => {
    const newField = { ...field, userId: user.id };
    await saveField(newField);
    await loadFields();
  }, [user, loadFields]);

  const removeField = useCallback(async (fieldId) => {
    await deleteField(fieldId, user.id);
    await loadFields();
  }, [user, loadFields]);

  const addJob = useCallback(async (job) => {
    const newJob = { ...job, userId: user.id, payments: job.payments || [] };
    await saveJob(newJob);
    await loadJobs();
  }, [user, loadJobs]);

  const editJob = useCallback(async (job) => {
    await updateJob(job);
    await loadJobs();
  }, [loadJobs]);

  const removeJob = useCallback(async (jobId) => {
    await deleteJob(jobId);
    await loadJobs();
  }, [loadJobs]);

  // Record a partial or full payment
  const addPayment = useCallback(async (jobId, amount, note = '') => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const payment = {
      id: generateId(),
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      note: note.trim(),
    };

    const payments = [...(job.payments || []), payment];
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const fullyPaid = totalPaid >= parseFloat(job.totalPrice || 0) - 0.001;

    await updateJob({
      ...job,
      payments,
      paid: fullyPaid,
      paidDate: fullyPaid ? new Date().toISOString() : job.paidDate,
    });
    await loadJobs();
  }, [jobs, loadJobs]);

  // Remove a single payment entry
  const removePayment = useCallback(async (jobId, paymentId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const payments = (job.payments || []).filter((p) => p.id !== paymentId);
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const fullyPaid = totalPaid >= parseFloat(job.totalPrice || 0) - 0.001;

    await updateJob({
      ...job,
      payments,
      paid: fullyPaid,
      paidDate: fullyPaid ? (job.paidDate || new Date().toISOString()) : null,
    });
    await loadJobs();
  }, [jobs, loadJobs]);

  // Mark fully paid in one tap (adds a single payment for the remaining amount)
  const markPaid = useCallback(async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const remaining = getRemainingAmount(job);
    if (remaining > 0.001) {
      await addPayment(jobId, remaining, 'Full payment');
    } else {
      await updateJob({ ...job, paid: true, paidDate: job.paidDate || new Date().toISOString() });
      await loadJobs();
    }
  }, [jobs, addPayment, loadJobs]);

  // Clear all payments
  const markUnpaid = useCallback(async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    await updateJob({ ...job, payments: [], paid: false, paidDate: null });
    await loadJobs();
  }, [jobs, loadJobs]);

  const stats = useMemo(() => ({
    totalJobs:     jobs.length,
    totalSurface:  jobs.reduce((s, j) => s + parseFloat(j.surface || 0), 0),
    totalEarned:   jobs.reduce((s, j) => s + parseFloat(j.totalPrice || 0), 0),
    totalPaid:     jobs.reduce((s, j) => s + getAmountPaid(j), 0),
    totalUnpaid:   jobs.reduce((s, j) => s + getRemainingAmount(j), 0),
    unpaidCount:   jobs.filter((j) => getPaymentStatus(j) !== 'paid').length,
    partialCount:  jobs.filter((j) => getPaymentStatus(j) === 'partial').length,
  }), [jobs]);

  return (
    <DataContext.Provider value={{
      jobs, stats, loaded,
      loadJobs, addJob, editJob, removeJob,
      addPayment, removePayment, markPaid, markUnpaid,
      fields, loadFields, addField, removeField,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
