import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { fetchMembers } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import type { Member } from '@/types/finance';
import { BANGLA_MONTHS } from '@/lib/months';

export interface QuickPaymentEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RowData {
  member_id: string;
  amount: number;
  payment_date: string;
  for_year: number;
  for_month: number;
  method: string;
  note?: string;
}

export const QuickPaymentEntry: React.FC<QuickPaymentEntryProps> = ({ open, onOpenChange }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMembers();
        setMembers(data);
      } catch (e) {
        toast({ title: 'সদস্য লোড ব্যর্থ', variant: 'destructive' });
      }
    };
    load();
  }, []);

  useEffect(() => {
    setRows((prevRows) =>
      selectedIds.map((id) => {
        const existing = prevRows.find((r) => r.member_id === id);
        return (
          existing || {
            member_id: id,
            amount: 0,
            payment_date: new Date().toISOString().split('T')[0],
            for_year: new Date().getFullYear(),
            for_month: new Date().getMonth() + 1,
            method: 'cash',
            note: '',
          }
        );
      })
    );
  }, [selectedIds]);

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions);
    const ids = options.map((opt) => opt.value);
    setSelectedIds(ids);
  };

  const updateRow = (memberId: string, field: keyof RowData, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => (r.member_id === memberId ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async () => {
    // Simple validation
    for (const r of rows) {
      if (!r.amount || r.amount <= 0) {
        toast({ title: 'অবৈধ পরিমাণ', variant: 'destructive' });
        return;
      }
      if (!r.for_year || !r.for_month || !r.method) {
        toast({ title: 'সকল প্রয়োজনীয় তথ্য পূরণ করুন', variant: 'destructive' });
        return;
      }
    }
    try {
      const { error } = await supabase.from('payments').insert(rows as any);
      if (error) throw error;
      toast({ title: `${rows.length} টি পেমেন্ট রেকর্ড হয়েছে` });
      // Reset
      setSelectedIds([]);
      setRows([]);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'পেমেন্ট যোগ ব্যর্থ', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-morphism max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">দ্রুত পেমেন্ট এন্ট্রি</DialogTitle>
          <DialogDescription>একাধিক সদস্যের জন্য একবারে পেমেন্ট যোগ করুন।</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block font-medium text-foreground mb-1">সদস্য নির্বাচন (Ctrl+Click মাল্টি‑সিলেক্ট)</label>
            <select
              multiple
              className="w-full p-2 border rounded bg-card text-foreground min-h-[120px]"
              value={selectedIds}
              onChange={handleMemberSelect}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.member_code} – {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2 mt-4 max-h-[50vh] overflow-y-auto pr-1">
              <div className="hidden md:grid md:grid-cols-7 gap-2 text-xs font-semibold text-muted-foreground px-1">
                <div className="col-span-1">সদস্য</div>
                <div>তারিখ</div>
                <div>মাস</div>
                <div>বছর</div>
                <div>পদ্ধতি</div>
                <div>পরিমাণ</div>
                <div>মন্তব্য</div>
              </div>
              {rows.map((row) => (
                <div
                  key={row.member_id}
                  className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center p-2 rounded-lg border bg-card/50"
                >
                  <div
                    className="col-span-1 font-medium text-sm truncate"
                    title={members.find((m) => m.id === row.member_id)?.full_name}
                  >
                    {members.find((m) => m.id === row.member_id)?.full_name || 'অজানা'}
                  </div>
                  <Input
                    type="date"
                    value={row.payment_date}
                    onChange={(e) => updateRow(row.member_id, 'payment_date', e.target.value)}
                    className="text-xs h-9"
                  />
                  <select
                    value={row.for_month}
                    onChange={(e) => updateRow(row.member_id, 'for_month', Number(e.target.value))}
                    className="h-9 p-1 border rounded bg-card text-foreground text-xs"
                  >
                    {BANGLA_MONTHS.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="2000"
                    max="2100"
                    value={row.for_year}
                    onChange={(e) => updateRow(row.member_id, 'for_year', Number(e.target.value))}
                    placeholder="বছর"
                    className="text-xs h-9"
                  />
                  <select
                    value={row.method}
                    onChange={(e) => updateRow(row.member_id, 'method', e.target.value)}
                    className="h-9 p-1 border rounded bg-card text-foreground text-xs"
                  >
                    <option value="cash">ক্যাশ (Cash)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="rocket">রকেট (Rocket)</option>
                    <option value="bank">ব্যাংক (Bank)</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="পরিমাণ"
                    value={row.amount || ''}
                    onChange={(e) => updateRow(row.member_id, 'amount', Number(e.target.value))}
                    className="text-xs h-9"
                  />
                  <Input
                    placeholder="মন্তব্য (ঐচ্ছিক)"
                    value={row.note || ''}
                    onChange={(e) => updateRow(row.member_id, 'note', e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button onClick={handleSubmit} className="bg-gold-gradient text-white hover:scale-105 transition-transform">
            সংরক্ষণ করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
