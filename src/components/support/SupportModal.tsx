import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle, Clock, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ApiClient } from '../../lib/api.js';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order_issue');
  const [message, setMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadTickets = async () => {
    if (!user) return;
    try {
      const res = await ApiClient.getSupportTickets();
      if (res.success && res.tickets) {
        setTickets(res.tickets);
        if (res.tickets.length > 0 && !selectedTicket) {
          setSelectedTicket(res.tickets[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('');
    try {
      const res = await ApiClient.createSupportTicket({ subject, category, message });
      if (res.success) {
        setSubject('');
        setMessage('');
        setIsCreatingNew(false);
        setFeedback('تم إرسال تذكرتك بنجاح!');
        await loadTickets();
        setSelectedTicket(res.ticket);
      }
    } catch (err: any) {
      setFeedback(err.message || 'حدث خطأ أثناء إرسال التذكرة');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    try {
      const res = await ApiClient.replySupportTicket(selectedTicket.id, replyText);
      if (res.success) {
        setReplyText('');
        setSelectedTicket(res.ticket);
        await loadTickets();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">مركز الدعم والمساعدة الفورية</h3>
              <p className="text-xs text-stone-400">فريق خدمة العملاء جاهز للإجابة على مدار الساعة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Tickets List */}
          <div className="w-1/3 border-l border-stone-200 bg-stone-50 p-3 flex flex-col">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedTicket(null);
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs mb-3 transition"
            >
              <Plus className="w-4 h-4" />
              تذكرة جديدة
            </button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {tickets.length === 0 ? (
                <p className="text-center text-xs text-stone-400 py-6">لا توجد تذاكر دعم سابقة</p>
              ) : (
                tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setIsCreatingNew(false);
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs transition border ${
                      selectedTicket?.id === t.id
                        ? 'bg-white border-amber-400 shadow-xs font-bold text-amber-900'
                        : 'bg-white/60 border-stone-200 text-stone-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-stone-500">{t.ticket_number}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          t.status === 'open'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t.status === 'open' ? 'مفتوحة' : t.status === 'in_progress' ? 'قيد المتابعة' : 'مغلقة'}
                      </span>
                    </div>
                    <div className="truncate text-stone-900">{t.subject}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Area: Ticket Chat or Create Form */}
          <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto">
            {isCreatingNew ? (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <h4 className="font-bold text-stone-900 text-sm">إنشاء تذكرة جديدة لفريق الدعم</h4>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع المشكلة / الموضوع</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="order_issue">مشكلة في طلب طعام</option>
                    <option value="payment_issue">استفسار مالي أو دفع</option>
                    <option value="driver_feedback">ملاحظة على التوصيل أو المندوب</option>
                    <option value="restaurant_partner">استفسار انضمام مطعم جديد</option>
                    <option value="technical">مشكلة تقنية في التطبيق</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">عنوان التذكرة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تأخر استلام الطلب رقم WS-2026-102"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تفاصيل الرسالة</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="اشرح المشكلة بالتفصيل لنتمكن من مساعدتك بأفضل شكل..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-xs transition text-xs"
                >
                  {loading ? 'جاري الإرسال...' : 'إرسال التذكرة الآن'}
                </button>
              </form>
            ) : selectedTicket ? (
              <div className="flex-1 flex flex-col">
                <div className="border-b border-stone-200 pb-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">{selectedTicket.subject}</span>
                    <span className="text-[10px] text-stone-400">{selectedTicket.ticket_number}</span>
                  </div>
                  <span className="text-[11px] text-stone-500">الفئة: {selectedTicket.category}</span>
                </div>

                {/* Messages conversation */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
                  {selectedTicket.messages?.map((msg: any, idx: number) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-amber-50 text-stone-900 border border-amber-200 rounded-tr-xs'
                              : 'bg-stone-100 text-stone-900 border border-stone-200 rounded-tl-xs'
                          }`}
                        >
                          <div className="font-bold text-[10px] text-amber-700 mb-1">
                            {msg.sender_name} ({msg.sender_role === 'admin' ? 'فريق الدعم' : 'أنت'})
                          </div>
                          <div>{msg.text}</div>
                          <div className="text-[9px] text-stone-400 mt-1 text-left">
                            {new Date(msg.sent_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-stone-100">
                  <input
                    type="text"
                    placeholder="اكتب ردك هنا..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">اختر تذكرة من القائمة لعرض المحادثة أو أنشئ تذكرة جديدة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
