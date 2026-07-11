import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Plus, 
  FileText,
  Calendar,
  User,
  History,
  Lock,
  Unlock
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientLedger = () => {
  const [data, setData] = useState({
    clients: [],
    ledgerEntries: [],
    allEntries: [],
    selectedClientId: '',
    loading: true,
    totalOutstanding: 0
  });
  const [periodClosures, setPeriodClosures] = useState([]);

  // Helper to check if a date is within a closed period
  const checkPeriodStatus = (date) => {
    if (!date) return { locked: false, closure: null };
    
    const targetDate = new Date(date);
    const closure = periodClosures.find(c => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return targetDate >= start && targetDate <= end && 
             c.status === "Closed" && 
             c.modules?.quotations?.closed;
    });

    return { locked: !!closure, closure };
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    clientId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    referenceNo: '',
    notes: ''
  });

  const fetchData = async (clientId = '') => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      const [clientsRes, oasRes, paymentsRes, closuresRes] = await Promise.all([
        axiosInstance.post('/populate/read/clients', { limit: 1000, select: 'name _id' }),
        axiosInstance.post('/populate/read/orderacknowledgments', { 
          filter: { status: 'Approved' }, 
          limit: 2000 
        }),
        axiosInstance.post('/populate/read/payments', { 
          filter: { status: 'Confirmed' }, 
          limit: 2000 
        }),
        axiosInstance.post('/populate/read/periodclosures', { limit: 1000, sort: { createdAt: -1 } })
      ]);

      const clients = clientsRes.data?.data || [];
      const oas = oasRes.data?.data || [];
      const payments = paymentsRes.data?.data || [];
      setPeriodClosures(closuresRes.data?.data || []);

      // Process All Clients Summary
      const clientSummaries = clients.map(client => {
        const clientOAs = oas.filter(o => (o.clientId?._id || o.clientId) === client._id);
        const clientPayments = payments.filter(p => (p.clientId?._id || p.clientId) === client._id);
        
        const credit = clientOAs.reduce((sum, o) => sum + (o.committedPrice || 0), 0);
        const debit = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        
        return {
          ...client,
          credit,
          debit,
          balance: credit - debit
        };
      }).filter(c => c.credit > 0 || c.debit > 0);

      // Process Consolidated Ledger (All transactions across all clients)
      const allEntries = [
        ...oas.map(o => ({
          date: o.createdAt,
          clientName: o.clientId?.name || 'Unknown',
          description: `OA: ${o.oaNumber}`,
          credit: o.committedPrice,
          debit: 0,
          type: 'CR'
        })),
        ...payments.map(p => ({
          date: p.paymentDate,
          clientName: p.clientId?.name || 'Unknown',
          description: `Payment: ${p.referenceNo || 'Ref'}`,
          credit: 0,
          debit: p.amount,
          type: 'DR'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first for global view

      // Process Client Specific Ledger Entries with Running Balance (if client selected)
      let ledgerEntries = [];
      if (clientId) {
        const clientOAs = oas.filter(o => (o.clientId?._id || o.clientId) === clientId);
        const clientPayments = payments.filter(p => (p.clientId?._id || p.clientId) === clientId);

        const clientEntries = [
          ...clientOAs.map(o => ({
            date: o.createdAt,
            description: `OA: ${o.oaNumber}`,
            credit: o.committedPrice || 0,
            debit: 0,
            type: 'CR'
          })),
          ...clientPayments.map(p => ({
            date: p.paymentDate,
            description: `Payment: ${p.referenceNo || 'Ref'}`,
            credit: 0,
            debit: p.amount || 0,
            type: 'DR'
          }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first for running balance

        let runningBalance = 0;
        ledgerEntries = clientEntries.map(entry => {
          runningBalance += (entry.credit - entry.debit);
          return {
            ...entry,
            balance: runningBalance
          };
        });
      }

      const totalOutstanding = clientSummaries.reduce((sum, c) => sum + c.balance, 0);

      setData({
        clients: clientSummaries,
        ledgerEntries: ledgerEntries, // Client specific (sorted asc)
        allEntries, // Global (sorted desc)
        selectedClientId: clientId,
        loading: false,
        totalOutstanding
      });
    } catch (err) {
      toast.error('Failed to fetch financial data');
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPayment = async () => {
    if (!newPayment.clientId || !newPayment.amount) {
      return toast.error('Please fill in required fields');
    }
    try {
      await axiosInstance.post('/populate/create/payments', newPayment);
      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      fetchData(data.selectedClientId);
    } catch (err) {
      toast.error('Error recording payment');
    }
  };

  return (
    <div className="space-y-6 pb-12" data-module="project">
      {/* Header */}
      <div className="flex justify-between items-end bg-surface p-8 rounded-tracker-xl border border-hairline shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="lmx-page-eyebrow mb-2">Accounting & Finance</div>
          <h1 className="text-3xl font-black text-ink tracking-tight">Client Payment Ledger</h1>
          <p className="text-ink-muted max-w-md mt-2">Manage commercial contracts, payments, and outstanding balances.</p>
        </div>
        <div className="relative z-10 flex flex-col items-end gap-2">
           <p className="text-[10px] font-black text-ink-subtle uppercase tracking-widest">Total Outstanding</p>
           <h2 className="text-3xl font-black text-tracker-danger tracking-tighter">
             ₹{data.totalOutstanding.toLocaleString()}
           </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Client Filter/List */}
        <div className="lg:col-span-4 space-y-4">
           <div className="bg-surface rounded-tracker-xl border border-hairline shadow-sm overflow-hidden">
              <div className="p-4 border-b border-hairline bg-canvas/50">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filter by Client Name..." 
                      className="w-full pl-10 pr-4 py-2 bg-surface border border-hairline rounded-tracker-lg text-sm focus:ring-2 ring-brand/20 outline-none"
                    />
                 </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                 <button 
                   onClick={() => fetchData('')}
                   className={`w-full text-left px-6 py-4 border-b border-hairline-soft transition-colors ${!data.selectedClientId ? 'bg-brand/5 border-l-4 border-l-brand' : 'hover:bg-canvas'}`}
                 >
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-sm text-ink">All Clients (Consolidated)</span>
                       <span className="text-[10px] font-black text-ink-subtle">{data.clients.length}</span>
                    </div>
                 </button>
                 {data.clients.map(client => (
                   <button 
                     key={client._id}
                     onClick={() => fetchData(client._id)}
                     className={`w-full text-left px-6 py-4 border-b border-hairline-soft transition-colors ${data.selectedClientId === client._id ? 'bg-brand/5 border-l-4 border-l-brand' : 'hover:bg-canvas'}`}
                   >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-ink truncate max-w-[150px]">{client.name}</span>
                        <span className={`text-[11px] font-black ${client.balance > 0 ? 'text-tracker-danger' : 'text-tracker-success'}`}>
                          ₹{client.balance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold text-ink-subtle">
                         <span>CR: ₹{client.credit.toLocaleString()}</span>
                         <span>DR: ₹{client.debit.toLocaleString()}</span>
                      </div>
                   </button>
                 ))}
              </div>
           </div>

           <button 
             onClick={() => setIsPaymentModalOpen(true)}
             className="w-full tracker-btn-brand py-4 rounded-tracker-xl flex items-center justify-center gap-2 shadow-lg"
           >
              <Plus size={20} />
              <span className="font-bold">Record Client Payment</span>
           </button>
        </div>

        {/* Right: Detailed Ledger or All Clients Summary */}
        <div className="lg:col-span-8">
           <div className="bg-surface rounded-tracker-xl border border-hairline shadow-card min-h-[600px] overflow-hidden flex flex-col">
              {!data.selectedClientId ? (
                /* Consolidated View */
                <>
                  <div className="p-6 border-b border-hairline flex items-center gap-3">
                     <FileText className="text-brand" />
                     <h3 className="text-lg font-black text-ink">Consolidated Transaction Journal (All Clients)</h3>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 text-right">Credit</th>
                          <th className="px-6 py-4 text-right">Debit</th>
                          <th className="px-6 py-4">Period Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline-soft">
                        {data.allEntries.map((entry, idx) => {
                          const periodStatus = checkPeriodStatus(entry.date);
                          return (
                            <tr key={idx} className="hover:bg-canvas/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-ink-muted">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 font-bold text-sm text-ink">{entry.clientName}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-ink">
                                 {entry.description}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-ink">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}</td>
                              <td className="px-6 py-4 text-right text-sm text-tracker-success">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}</td>
                              <td className="px-6 py-4">
                                {periodStatus.locked ? (
                                  <span className="flex items-center gap-1 text-[11px] text-rose-600">
                                    <Lock size={11} /> Locked
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                    <Unlock size={11} /> Open
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                /* Specific Client Ledger */
                <>
                  <div className="p-6 border-b border-hairline flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <History className="text-brand" />
                        <div>
                          <h3 className="text-lg font-black text-ink">
                            {data.clients.find(c => c._id === data.selectedClientId)?.name}'s Ledger
                          </h3>
                          <p className="text-[10px] font-bold text-ink-muted uppercase">Transaction History & Reconcilliation</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-ink-subtle uppercase tracking-wider">Outstanding Balance</p>
                        <p className="text-xl font-black text-tracker-danger">
                          ₹{data.clients.find(c => c._id === data.selectedClientId)?.balance.toLocaleString()}
                        </p>
                     </div>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-canvas/50 text-[10px] font-black text-ink-subtle uppercase tracking-widest border-b border-hairline">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 text-right">Credit</th>
                          <th className="px-6 py-4 text-right">Debit</th>
                          <th className="px-6 py-4 text-right">Balance</th>
                          <th className="px-6 py-4">Period Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline-soft">
                        {data.ledgerEntries.map((entry, idx) => {
                          const periodStatus = checkPeriodStatus(entry.date);
                          return (
                            <tr key={idx} className="hover:bg-canvas/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-ink-muted">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-ink">
                                 {entry.description}
                                 {entry.type === 'DR' && <span className="ml-2 text-[8px] bg-tracker-success/10 text-tracker-success px-1.5 py-0.5 rounded font-black uppercase">Paid</span>}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-ink">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}</td>
                              <td className="px-6 py-4 text-right text-sm text-tracker-success">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}</td>
                              <td className="px-6 py-4 text-right font-black text-sm text-ink">₹{entry.balance.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                {periodStatus.locked ? (
                                  <span className="flex items-center gap-1 text-[11px] text-rose-600">
                                    <Lock size={11} /> Locked
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                    <Unlock size={11} /> Open
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-md">
          <div className="bg-surface w-full max-w-md rounded-tracker-xl shadow-overlay overflow-hidden border border-hairline animate-in fade-in zoom-in duration-200">
             <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-ink flex items-center gap-2">
                      <CreditCard className="text-brand" /> Record Payment
                    </h3>
                    <p className="text-sm text-ink-muted mt-1">Add a new financial transaction for a client.</p>
                  </div>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="text-2xl hover:text-brand transition-colors">&times;</button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase">Select Client</label>
                    <select 
                      className="lmx-input"
                      value={newPayment.clientId}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, clientId: e.target.value }))}
                    >
                      <option value="">Select a client...</option>
                      {data.clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase">Amount (₹)</label>
                    <input 
                      type="number" 
                      className="lmx-input" 
                      placeholder="e.g. 50000"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-ink-subtle uppercase">Date</label>
                      <input 
                        type="date" 
                        className="lmx-input"
                        value={newPayment.paymentDate}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-ink-subtle uppercase">Method</label>
                      <select 
                        className="lmx-input"
                        value={newPayment.paymentMethod}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase">Reference # / Notes</label>
                    <input 
                      type="text" 
                      className="lmx-input" 
                      placeholder="e.g. TXN-12345 or Cheque ID"
                      value={newPayment.referenceNo}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, referenceNo: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-hairline">
                  <button onClick={() => setIsPaymentModalOpen(false)} className="tracker-btn-secondary px-6">Cancel</button>
                  <button 
                    onClick={handleAddPayment}
                    className="tracker-btn-brand px-8"
                  >
                    Confirm Payment
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientLedger;
