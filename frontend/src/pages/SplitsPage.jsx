import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Users,
  Plus,
  Check,
  Trash2,
  Share2,
  ArrowRight,
  Sparkles,
  X,
  CreditCard,
  QrCode,
  DollarSign
} from 'lucide-react';

export default function SplitsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('👥');
  const [newMemberInputs, setNewMemberInputs] = useState(['Rohan', 'Sneha', 'Kabir']);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Add Expense Form
  const [payerName, setPayerName] = useState('You');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'exact' | 'percentage' | 'shares'
  const [customShares, setCustomShares] = useState({});
  const [submittingExpense, setSubmittingExpense] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      const res = await api.get('/splits/groups/all');
      setGroups(res.data || []);
      if (res.data?.length > 0 && !selectedGroup) {
        selectGroup(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function selectGroup(group) {
    setSelectedGroup(group);
    try {
      const res = await api.get(`/splits/groups/${group.id}/details`);
      setGroupDetails(res.data);
      setPayerName(res.data.members[0]?.name || 'You');

      // Initialize default equal split shares
      const initialShares = {};
      res.data.members.forEach(m => initialShares[m.name] = '');
      setCustomShares(initialShares);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreatingGroup(true);
    try {
      const members = newMemberInputs.filter(n => n.trim()).map(n => ({ name: n.trim() }));
      const res = await api.post('/splits/groups', {
        name: newGroupName.trim(),
        emoji: newGroupEmoji,
        members
      });
      setShowCreateGroupModal(false);
      setNewGroupName('');
      loadGroups();
      selectGroup(res.data);
    } catch (err) {
      alert('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc || isNaN(amt) || amt <= 0 || !groupDetails) return;

    const members = groupDetails.members;
    let computedShares = [];

    if (splitType === 'equal') {
      const perHead = Math.round((amt / members.length) * 100) / 100;
      computedShares = members.map(m => ({
        member_name: m.name,
        share_amount: perHead
      }));
    } else if (splitType === 'exact') {
      computedShares = members.map(m => ({
        member_name: m.name,
        share_amount: parseFloat(customShares[m.name]) || 0
      }));
    } else if (splitType === 'percentage') {
      computedShares = members.map(m => ({
        member_name: m.name,
        share_amount: Math.round(((parseFloat(customShares[m.name]) || 0) / 100) * amt)
      }));
    } else if (splitType === 'shares') {
      const totalParts = members.reduce((sum, m) => sum + (parseFloat(customShares[m.name]) || 1), 0);
      computedShares = members.map(m => {
        const parts = parseFloat(customShares[m.name]) || 1;
        return {
          member_name: m.name,
          share_amount: Math.round((parts / totalParts) * amt)
        };
      });
    }

    setSubmittingExpense(true);
    try {
      await api.post(`/splits/groups/${groupDetails.group.id}/expenses`, {
        payer_name: payerName,
        amount: amt,
        description: expenseDesc.trim(),
        split_type: splitType,
        shares: computedShares
      });

      setShowAddExpenseModal(false);
      setExpenseDesc('');
      setExpenseAmount('');
      selectGroup(groupDetails.group);
    } catch (err) {
      alert('Failed to log split expense');
    } finally {
      setSubmittingExpense(false);
    }
  }

  function handleShareWhatsApp() {
    if (!groupDetails) return;
    const { group, settlements } = groupDetails;
    let text = `💸 *${group.name} Split Summary*\n\n`;
    if (settlements.length === 0) {
      text += `All settled up! Nobody owes anything. 🎉\n`;
    } else {
      text += `*Who owes what (Simplified Settle-up):*\n`;
      settlements.forEach(s => {
        text += `• ${s.from} owes ${s.to} ₹${s.amount}\n`;
      });
    }
    text += `\nTracked via *Paise Bachao* ✨`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function generateUpiUrl(receiverName, amount) {
    return `upi://pay?pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Bill Split')}`;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-black text-text tracking-tight">
            Split Bills
          </h1>
          <p className="text-xs text-text-muted font-bold">
            Hostel, outings, trips & simplified settle-up
          </p>
        </div>

        <button
          onClick={() => setShowCreateGroupModal(true)}
          className="btn-brutal py-1.5 px-3 text-xs font-black bg-primary text-white flex items-center gap-1"
        >
          <Plus size={14} />
          <span>New Group</span>
        </button>
      </div>

      {/* Group Pills Horizontal Bar */}
      {groups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGroup(g)}
              className={`px-3.5 py-1.5 rounded-xl border-2 text-xs font-heading font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedGroup?.id === g.id
                  ? 'border-border bg-highlight text-text shadow-sticker font-black scale-102'
                  : 'border-border/60 bg-surface text-text-muted hover:border-border'
              }`}
            >
              <span>{g.emoji || '👥'}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Group Content */}
      {groupDetails ? (
        <div className="space-y-4">
          {/* Group Overview Banner */}
          <div className="card-brutal p-4 bg-surface border-2 border-border shadow-sticker space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{groupDetails.group.emoji || '👥'}</span>
                <div>
                  <h2 className="text-base font-heading font-black text-text">
                    {groupDetails.group.name}
                  </h2>
                  <p className="text-[11px] text-text-muted font-medium">
                    {groupDetails.members.length} members • {groupDetails.expenses.length} bills recorded
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-8 h-8 rounded-xl border border-border bg-bg flex items-center justify-center text-text-muted hover:text-text"
                  title="Share to WhatsApp"
                >
                  <Share2 size={15} />
                </button>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="btn-brutal py-1.5 px-3 text-xs font-black bg-primary text-white flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Bill</span>
                </button>
              </div>
            </div>

            {/* Simplified Settle-Up Card */}
            <div className="p-3 bg-bg rounded-2xl border-2 border-border space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text">
                  Simplified Settle-Up
                </h3>
                <span className="text-[10px] text-text-muted font-bold">Minimizes transactions</span>
              </div>

              {groupDetails.settlements.length === 0 ? (
                <div className="text-center py-2 text-xs font-bold text-income flex items-center justify-center gap-1.5">
                  <Check size={16} />
                  <span>All settled up! Nobody owes anything.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupDetails.settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-black text-expense">{s.from}</span>
                        <ArrowRight size={13} className="text-text-muted" />
                        <span className="font-heading font-black text-income">{s.to}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-text">₹{s.amount}</span>
                        <a
                          href={generateUpiUrl(s.to, s.amount)}
                          className="px-2 py-0.5 rounded-lg bg-primary text-white text-[10px] font-heading font-black hover:bg-primary/90 flex items-center gap-0.5"
                        >
                          <QrCode size={11} />
                          <span>Pay UPI</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Logged Bills in this group */}
          <div className="space-y-2">
            <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-muted">
              Recent Bills in this Group
            </h3>

            {groupDetails.expenses.length === 0 ? (
              <div className="card-brutal p-6 bg-surface text-center space-y-2 border-2 border-border">
                <span className="text-3xl">🍕</span>
                <p className="text-xs font-bold text-text">No bills recorded in {groupDetails.group.name} yet</p>
                <p className="text-[11px] text-text-muted">Tap "Add Bill" to split a lunch, trip, or recharge!</p>
              </div>
            ) : (
              groupDetails.expenses.map((e) => (
                <div key={e.id} className="card-brutal p-3 bg-surface border-2 border-border flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-heading font-black text-text">{e.description}</h4>
                    <p className="text-[10px] text-text-muted">
                      Paid by <span className="font-bold text-text">{e.payer_name}</span> • {formatDate(e.date)}
                    </p>
                  </div>
                  <span className="text-sm font-heading font-black text-primary">₹{e.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="card-brutal p-8 bg-surface text-center space-y-3 border-2 border-border shadow-sticker">
          <span className="text-4xl">👥</span>
          <h2 className="text-base font-heading font-black text-text">No Split Groups Yet</h2>
          <p className="text-xs text-text-muted max-w-xs mx-auto">
            Create a group for your hostel room, flatmates, or Goa trip to track who owes whom with instant UPI payments!
          </p>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="btn-brutal py-2.5 px-4 text-xs font-black bg-primary text-white"
          >
            Create First Group
          </button>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b-2 border-border">
              <h3 className="text-sm font-heading font-black text-text">Create Split Group</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-text font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Hostel Room 302"
                  className="input-brutal text-sm py-2 px-3"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Group Emoji</label>
                <div className="flex gap-2">
                  {['👥', '🏠', '🏖️', '🍕', '🚗', '🎉'].map((em) => (
                    <button
                      type="button"
                      key={em}
                      onClick={() => setNewGroupEmoji(em)}
                      className={`w-9 h-9 rounded-xl border-2 text-base flex items-center justify-center ${
                        newGroupEmoji === em ? 'border-border bg-highlight shadow-sticker scale-105' : 'border-border/50 bg-bg'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Friends in this Group</label>
                <p className="text-[10px] text-text-muted mb-1">You are included automatically!</p>
                <div className="space-y-1.5">
                  {newMemberInputs.map((n, i) => (
                    <input
                      key={i}
                      type="text"
                      value={n}
                      onChange={(e) => {
                        const copy = [...newMemberInputs];
                        copy[i] = e.target.value;
                        setNewMemberInputs(copy);
                      }}
                      placeholder={`Friend #${i + 1} name`}
                      className="input-brutal text-xs py-1.5 px-2.5"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewMemberInputs([...newMemberInputs, ''])}
                    className="text-[11px] font-heading font-bold text-primary hover:underline block pt-1"
                  >
                    + Add Another Friend
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="btn-brutal-secondary py-2 text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="btn-brutal py-2 text-xs font-black flex-1 bg-primary text-white"
                >
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showAddExpenseModal && groupDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-brutal w-full max-w-sm bg-surface border-3 border-border shadow-sticker-lg p-5 space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b-2 border-border">
              <h3 className="text-sm font-heading font-black text-text">Add Group Bill</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-text font-bold">✕</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Description</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. Dinner at Dosa Plaza"
                  className="input-brutal text-sm py-2 px-3"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Total Bill Amount (₹)</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 640"
                  className="input-brutal text-lg font-heading font-black text-primary py-2 px-3"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Who Paid?</label>
                <select
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="input-brutal text-xs py-2 px-2.5"
                >
                  {groupDetails.members.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Split Type</label>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                  {[
                    { id: 'equal', label: 'Equal' },
                    { id: 'exact', label: 'Exact' },
                    { id: 'percentage', label: '%' },
                    { id: 'shares', label: 'Parts' }
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setSplitType(st.id)}
                      className={`py-1.5 rounded-lg border text-center ${
                        splitType === st.id ? 'bg-primary text-white border-border shadow-xs' : 'bg-bg text-text-muted border-border/50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {splitType !== 'equal' && (
                <div className="space-y-1.5 p-2 bg-bg rounded-xl border border-border">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Per Person Allocation</p>
                  {groupDetails.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span className="font-bold">{m.name}:</span>
                      <input
                        type="number"
                        placeholder={splitType === 'percentage' ? '%' : 'Amount'}
                        value={customShares[m.name] || ''}
                        onChange={(e) => setCustomShares({ ...customShares, [m.name]: e.target.value })}
                        className="input-brutal w-24 text-right py-1 px-2 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-text-muted">
                💡 Your own share will automatically be logged into your personal tracker!
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="btn-brutal-secondary py-2 text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="btn-brutal py-2 text-xs font-black flex-1 bg-primary text-white"
                >
                  {submittingExpense ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
