import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../src/store/auth';
import { useBudgetStore } from '../src/store/budget';
import { Transaction } from '../src/types';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Business', 'Investment', 'Gift', 'Other'];

// Format currency with commas
const formatCurrency = (amount: number, currency: string) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  if (currency === 'TZS') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' TZS';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

const inferCategoryFromHistory = (
  transactions: Transaction[],
  transactionType: 'expense' | 'income',
  merchant: string,
  note: string,
  tags: string,
  currentTransactionId: string
) => {
  const merchantText = merchant.trim().toLowerCase();
  const noteTokens = tokenize(note);
  const tagTokens = tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  if (!merchantText && noteTokens.length === 0 && tagTokens.length === 0) return null;

  const categoryScores = new Map<string, { score: number; examples: number }>();

  transactions.forEach((transaction) => {
    if (transaction.id === currentTransactionId) return;
    const candidateType = transaction.amount < 0 ? 'income' : 'expense';
    if (candidateType !== transactionType) return;

    let score = 0;
    const candidateMerchant = transaction.merchant?.trim().toLowerCase() || '';
    const candidateNoteTokens = tokenize(transaction.note || '');
    const candidateTags = (transaction.tags || []).map((tag) => tag.toLowerCase());

    if (merchantText && candidateMerchant) {
      if (candidateMerchant === merchantText) score += 7;
      else if (candidateMerchant.includes(merchantText) || merchantText.includes(candidateMerchant)) score += 4;
    }

    score += noteTokens.filter((token) => candidateNoteTokens.includes(token)).length * 2;
    score += tagTokens.filter((token) => candidateTags.includes(token)).length * 3;
    if (score <= 0) return;

    const current = categoryScores.get(transaction.category) || { score: 0, examples: 0 };
    categoryScores.set(transaction.category, { score: current.score + score, examples: current.examples + 1 });
  });

  const ranked = Array.from(categoryScores.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] ? { category: ranked[0].category, examples: ranked[0].examples } : null;
};

interface EditTransactionWebProps {
  transactionId: string;
  onBack: () => void;
  onSave: () => void;
}

export default function EditTransactionWeb({ transactionId, onBack, onSave }: EditTransactionWebProps) {
  const { user } = useAuthStore();
  const { transactions, updateTransaction, loading, budget, envelopes } = useBudgetStore();
  
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [envelopeTouched, setEnvelopeTouched] = useState(false);
  const [tagsTouched, setTagsTouched] = useState(false);
  const [noteTouched, setNoteTouched] = useState(false);

  // Find the transaction to edit
  const transaction = transactions.find(t => t.id === transactionId);

  // Format amount with commas
  const formatAmountWithCommas = (value: string) => {
    const cleanValue = value.replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    let integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decimalPart) {
      return `${integerPart}.${decimalPart}`;
    }
    return integerPart;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayAmount(formatAmountWithCommas(value));
    const cleanValue = value.replace(/[^\d.]/g, '');
    setAmount(cleanValue);
  };

  useEffect(() => {
    if (transaction) {
      const cleanAmount = Math.abs(transaction.amount).toString();
      setAmount(cleanAmount);
      setDisplayAmount(formatAmountWithCommas(cleanAmount));
      setCategory(transaction.category);
      setDate(transaction.date);
      setMerchant(transaction.merchant || '');
      setTags((transaction.tags || []).join(', '));
      setNote(transaction.note || '');
      setTransactionType(transaction.amount < 0 ? 'income' : 'expense');
      setEnvelopeId(transaction.envelope_id || '');
      setCategoryTouched(false);
      setEnvelopeTouched(false);
      setTagsTouched(false);
      setNoteTouched(false);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      // For income, we store as negative amount to increase balance
      const transactionAmount = transactionType === 'income' ? -Math.abs(parseFloat(amount)) : parseFloat(amount);
      
      await updateTransaction(
        transactionId,
        transactionAmount,
        category,
        date,
        note || undefined,
        envelopeId || null,
        {
          merchant: merchant || undefined,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          isRecurring: transaction?.is_recurring || false,
          recurringSourceId: transaction?.recurring_source_id || null,
          kind: transaction?.kind || 'standard',
          transferGroupId: transaction?.transfer_group_id || null,
          transferPeerEnvelopeId: transaction?.transfer_peer_envelope_id || null,
          transferDirection: transaction?.transfer_direction || null,
        }
      );
      
      const transactionTypeText = transactionType === 'income' ? 'Income' : 'Expense';
      setSuccess(`${transactionTypeText} of ${formatCurrency(Math.abs(parseFloat(amount)), budget?.currency || 'USD')} successfully updated!`);
      setTimeout(() => { onSave(); onBack(); }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) {
    return (
      <>
        <style>{`
          html, body {
            scrollbar-gutter: stable;
            overflow-y: scroll;
            margin: 0;
            padding: 0;
            width: 100%;
            background: var(--bg-main);
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: 'var(--bg-main)', 
          padding: '20px',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100vw',
          margin: '0',
          left: '0',
          right: '0'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Transaction not found</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '16px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };
  const isBusy = loading || isSubmitting;
  const merchantSuggestions = Array.from(new Set(transactions.map((item) => item.merchant).filter(Boolean))) as string[];
  const matchingMerchants = merchant
    ? merchantSuggestions.filter((candidate) => candidate.toLowerCase().includes(merchant.toLowerCase()) && candidate.toLowerCase() !== merchant.toLowerCase()).slice(0, 4)
    : merchantSuggestions.slice(0, 4);
  const smartCategorySuggestion = useMemo(
    () => inferCategoryFromHistory(transactions, transactionType, merchant, note, tags, transactionId),
    [merchant, note, tags, transactionId, transactionType, transactions]
  );
  const merchantMemory = merchant
    ? (() => {
        const normalizedMerchant = merchant.trim().toLowerCase();
        if (!normalizedMerchant) return null;
        const merchantMatches = transactions
          .filter((item) => item.id !== transactionId && item.merchant?.trim().toLowerCase() === normalizedMerchant)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (merchantMatches.length === 0) return null;
        const latest = merchantMatches[0];
        const categoryCounts = merchantMatches.reduce<Record<string, number>>((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});
        const suggestedCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || latest.category;
        return {
          count: merchantMatches.length,
          suggestedCategory,
          suggestedEnvelopeId: latest.envelope_id || '',
          suggestedTags: Array.from(new Set(merchantMatches.flatMap((item) => item.tags || []).filter(Boolean))).slice(0, 4),
          suggestedNote: latest.note || '',
        };
      })()
    : null;

  const applyMerchantMemory = (candidateMerchant?: string) => {
    const targetMerchant = candidateMerchant ?? merchant;
    if (!targetMerchant.trim()) return;

    if (candidateMerchant) {
      setMerchant(candidateMerchant);
    }

    const normalizedMerchant = targetMerchant.trim().toLowerCase();
    const merchantMatches = transactions
      .filter((item) => item.id !== transactionId && item.merchant?.trim().toLowerCase() === normalizedMerchant)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (merchantMatches.length === 0) return;

    const latest = merchantMatches[0];
    const categoryCounts = merchantMatches.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    const suggestedCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || latest.category;

    if (!categoryTouched) {
      setCategory(suggestedCategory);
    }
    if (!envelopeTouched) {
      setEnvelopeId(latest.envelope_id || '');
    }
    if (!tagsTouched && latest.tags?.length) {
      setTags(latest.tags.join(', '));
    }
    if (!noteTouched && latest.note) {
      setNote(latest.note);
    }
  };

  return (
    <>
      <style>{`
        html, body {
          scrollbar-gutter: stable;
          overflow-y: scroll;
          background: var(--bg-main);
          color: var(--text-main);
        }
        input:focus, select:focus {
          border-color: var(--primary) !important;
        }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '20px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                marginRight: '16px', padding: '8px', color: 'var(--text-main)'
              }}
            >
              ←
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Edit Transaction</h1>
          </div>

          <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
            
            {/* Type Toggle */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => { setTransactionType('expense'); if (!EXPENSE_CATEGORIES.includes(category)) setCategory(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: transactionType === 'expense' ? 'var(--danger)' : 'var(--bg-secondary)',
                  color: transactionType === 'expense' ? '#fff' : 'var(--text-secondary)',
                  border: transactionType === 'expense' ? 'none' : '2px solid var(--border-color)',
                }}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => { setTransactionType('income'); if (!INCOME_CATEGORIES.includes(category)) setCategory(''); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: transactionType === 'income' ? 'var(--success)' : 'var(--bg-secondary)',
                  color: transactionType === 'income' ? '#fff' : 'var(--text-secondary)',
                  border: transactionType === 'income' ? 'none' : '2px solid var(--border-color)',
                }}
              >
                Income
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Amount *</label>
              <input type="text" value={displayAmount} onChange={handleAmountChange} placeholder="0.00" required style={fieldStyle} />
            </div>

            {envelopes.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Envelope / Account</label>
                <select value={envelopeId} onChange={(e) => { setEnvelopeId(e.target.value); setEnvelopeTouched(true); }} style={fieldStyle}>
                  <option value="">Default Bank Account</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.icon} {env.name} ({formatCurrency(env.balance, env.currency)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Category *</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setCategoryTouched(true); }} required style={fieldStyle}>
                <option value="" disabled>Select a category</option>
                {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {/* Keep existing category if it's custom/old */}
                {category && !(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(category) && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={fieldStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => {
                  const nextMerchant = e.target.value;
                  setMerchant(nextMerchant);
                  const exactMatch = transactions.find((item) => item.id !== transactionId && item.merchant?.trim().toLowerCase() === nextMerchant.trim().toLowerCase());
                  if (exactMatch) {
                    applyMerchantMemory(nextMerchant);
                  }
                }}
                placeholder="e.g. Carrefour, Uber, Netflix"
                style={fieldStyle}
              />
              {matchingMerchants.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {matchingMerchants.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => applyMerchantMemory(candidate)}
                      style={{ padding: '8px 10px', borderRadius: '999px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}
              {merchantMemory && (
                <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.16)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
                    We found {merchantMemory.count} earlier entr{merchantMemory.count === 1 ? 'y' : 'ies'} for this merchant.
                    Suggested category: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{merchantMemory.suggestedCategory}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => applyMerchantMemory()}
                      style={{ padding: '8px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Apply merchant memory
                    </button>
                    {merchantMemory.suggestedTags.map((tag) => (
                      <span key={tag} style={{ padding: '8px 10px', borderRadius: '999px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {smartCategorySuggestion && (!merchantMemory || smartCategorySuggestion.category !== merchantMemory.suggestedCategory) && (
                <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
                    Best match from your history: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{smartCategorySuggestion.category}</span> from {smartCategorySuggestion.examples} similar entr{smartCategorySuggestion.examples === 1 ? 'y' : 'ies'}.
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCategory(smartCategorySuggestion.category); setCategoryTouched(true); }}
                    style={{ padding: '8px 12px', borderRadius: '999px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Use {smartCategorySuggestion.category}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Tags</label>
              <input type="text" value={tags} onChange={(e) => { setTags(e.target.value); setTagsTouched(true); }} placeholder="Comma-separated tags" style={fieldStyle} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Note (Optional)</label>
              <input type="text" value={note} onChange={(e) => { setNote(e.target.value); setNoteTouched(true); }} placeholder="What was this for?" style={fieldStyle} />
            </div>

            {error && (
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 'bold',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                border: '1px solid var(--danger-border)'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            {success && (
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 'bold',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success-text)',
                border: '1px solid var(--success-border)'
              }}>
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              style={{
                width: '100%', padding: '16px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: isBusy ? 'not-allowed' : 'pointer',
                opacity: isBusy ? 0.7 : 1, transition: 'background-color 0.2s'
              }}
            >
              {isBusy ? 'Saving changes...' : 'Update Transaction'}
            </button>
            
          </form>
        </div>
      </div>
    </>
  );
}
