import React, { createContext, useContext, useState, useCallback } from 'react';
import { getJobs, saveJob, updateJob, deleteJob, getFields, saveField, deleteField } from '../utils/storage';
import { useAuth } from './AuthContext';
import { getAmountPaid, getRemainingAmount, getPaymentStatus, generateId } from '../utils/helpers';

// re-export generateId from helpers
import { generateId as genId } from '../utils/helpers';

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

  const addField = async (field) => {
    const newField = { ...field, userId: user.id };
    await saveField(newField);
    await loadFields();
  };

  const removeField = async (fieldId) => {
    await deleteField(fieldId, user.id);
    await loadFields();
  };

  const addJob = async (job) => {
    const newJob = { ...job, userId: user.id, payments: job.payments || [] };
    await saveJob(newJob);
    await loadJobs();
  };

  const editJob = async (job) => {
    await updateJob(job);
    await loadJobs();
  };

  const removeJob = async (jobId) => {
    await deleteJob(jobId);
    await loadJobs();
  };

  // Record a partial or full payment
  const addPayment = async (jobId, amount, note = '') => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const payment = {
      id: genId(),
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
  };

  // Remove a single payment entry
  const removePayment = async (jobId, paymentId) => {
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
  };

  // Mark fully paid in one tap (adds a single payment for the remaining amount)
  const markPaid = async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const remaining = getRemainingAmount(job);
    if (remaining > 0.001) {
      await addPayment(jobId, remaining, 'Full payment');
    } else {
      // already paid — just ensure flag is set
      await updateJob({ ...job, paid: true, paidDate: job.paidDate || new Date().toISOString() });
      await loadJobs();
    }
  };

  // Clear all payments
  const markUnpaid = async (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    await updateJob({ ...job, payments: [], paid: false, paidDate: null });
    await loadJobs();
  };

  // Stats using new helpers
  const totalCollected = jobs.reduce((s, j) => s + getAmountPaid(j), 0);
  const totalPending   = jobs.reduce((s, j) => s + getRemainingAmount(j), 0);

  const stats = {
    totalJobs:     jobs.length,
    totalSurface:  jobs.reduce((s, j) => s + parseFloat(j.surface || 0), 0),
    totalEarned:   jobs.reduce((s, j) => s + parseFloat(j.totalPrice || 0), 0),
    totalPaid:     totalCollected,
    totalUnpaid:   totalPending,
    unpaidCount:   jobs.filter((j) => getPaymentStatus(j) !== 'paid').length,
    partialCount:  jobs.filter((j) => getPaymentStatus(j) === 'partial').length,
  };

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
