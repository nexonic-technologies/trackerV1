import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { 
  CreditCard, 
  User, 
  DollarSign, 
  Calendar, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const RecordPayment = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    referenceNo: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axiosInstance.post('/populate/read/clients', { 
        limit: 1000, 
        select: 'name _id Status' 
      });
      setClients(response.data?.data || []);
    } catch (err) {
      toast.error('Failed to load clients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId || !formData.amount) {
      return toast.error('Please select a client and enter amount');
    }

    setLoading(true);
    try {
      await axiosInstance.post('/populate/create/payments', formData);
      toast.success('Payment recorded successfully!');
      navigate('/accounts/ledger');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-surface rounded-tracker-2xl shadow-overlay border border-hairline overflow-hidden">
        {/* Header */}
        <div className="bg-brand p-10 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
           <div className="relative z-10">
              <h1 className="text-3xl font-black tracking-tight mb-2">Record Client Payment</h1>
              <p className="text-white/80 font-medium">Select a company and enter the transaction details to update the ledger.</p>
           </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Client Selection */}
              <div className="space-y-3">
                 <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                    <User size={14} className="text-brand" />
                    Company / Client
                 </label>
                 <select 
                    className="lmx-input h-14 text-base font-bold"
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    required
                 >
                    <option value="">Select Company...</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.Status === 'Active' ? '✓' : '(Inactive)'}
                      </option>
                    ))}
                 </select>
              </div>

              {/* Amount */}
              <div className="space-y-3">
                 <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={14} className="text-brand" />
                    Amount Received (₹)
                 </label>
                 <input 
                    type="number" 
                    className="lmx-input h-14 text-xl font-black text-brand"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                 />
              </div>

              {/* Date */}
              <div className="space-y-3">
                 <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} className="text-brand" />
                    Payment Date
                 </label>
                 <input 
                    type="date" 
                    className="lmx-input h-14"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    required
                 />
              </div>

              {/* Method */}
              <div className="space-y-3">
                 <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={14} className="text-brand" />
                    Payment Method
                 </label>
                 <select 
                    className="lmx-input h-14"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                 >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online / UPI</option>
                 </select>
              </div>
           </div>

           {/* Reference & Notes */}
           <div className="space-y-3">
              <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                 <FileText size={14} className="text-brand" />
                 Reference Number / Transaction ID
              </label>
              <input 
                 type="text" 
                 className="lmx-input h-14"
                 placeholder="e.g. CHQ-10023 or NEFT-REF-..."
                 value={formData.referenceNo}
                 onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
              />
           </div>

           <div className="space-y-3">
              <label className="text-[11px] font-black text-ink-subtle uppercase tracking-widest flex items-center gap-2">
                 <FileText size={14} className="text-brand" />
                 Additional Notes
              </label>
              <textarea 
                 className="lmx-input min-h-[100px] py-4"
                 placeholder="Any internal notes regarding this payment..."
                 value={formData.notes}
                 onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
           </div>

           {/* Actions */}
           <div className="pt-8 flex gap-4">
              <button 
                type="button"
                onClick={() => navigate('/accounts/ledger')}
                className="flex-1 tracker-btn-secondary py-4 font-bold"
              >
                Discard
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] tracker-btn-brand py-4 font-black flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? 'Processing...' : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirm & Update Ledger
                  </>
                )}
              </button>
           </div>
        </form>

        {/* Info Box */}
        <div className="bg-canvas p-6 flex gap-4 items-start border-t border-hairline">
           <AlertCircle className="text-ink-subtle shrink-0" size={20} />
           <p className="text-xs text-ink-muted leading-relaxed">
             By confirming this payment, the client's outstanding balance will be automatically reduced in the ledger. 
             This action will be logged for audit purposes and cannot be undone without manager approval.
           </p>
        </div>
      </div>
    </div>
  );
};

export default RecordPayment;
