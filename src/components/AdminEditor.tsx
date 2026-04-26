import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { Loader2, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

// Types
interface Member {
  id: string;
  name: string;
  area: string;
  phone?: string;
  designation?: string;
}
interface Contribution {
  id: string;
  name: string;
  area: string;
  amount: number;
  target_month: string;
  created_at: string;
  payment_method?: string;
  transaction_id?: string;
}
interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  note?: string;
}

/**
 * AdminEditor – A single‑page admin UI that lets privileged users
 * create, edit, and delete **Members**, **Contributions**, and **Expenses**.
 * It is rendered inside the existing admin tab of CommitteeContributions.
 */
const AdminEditor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // ------- Data fetching -------------------------------------------------
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: mem }, { data: contr }, { data: exp }] = await Promise.all([
        supabase.from("committee_members").select("*").order("name"),
        supabase.from("committee_contributions").select("*").order("created_at", { ascending: false }),
        supabase.from("committee_expenses").select("*").order("date", { ascending: false }),
      ]);
      setMembers(mem as Member[]);
      setContributions(contr as Contribution[]);
      setExpenses(exp as Expense[]);
    } catch (e) {
      console.error(e);
      toast.error("ডেটা লোডে ত্রুটি");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ------- Generic CRUD helpers ------------------------------------------
  const upsert = async (table: string, payload: any) => {
    const { data, error } = await supabase.from(table).upsert(payload, { returning: "representation" });
    if (error) throw error;
    return data;
  };

  const remove = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  };

  // ------- Member actions -----------------------------------------------
  const addMember = async (member: Partial<Member>) => {
    await upsert("committee_members", member);
    toast.success("সদস্য যুক্ত হয়েছে");
    fetchAll();
  };
  const editMember = async (member: Member) => {
    await upsert("committee_members", member);
    toast.success("সদস্য আপডেট হয়েছে");
    fetchAll();
  };
  const deleteMember = async (id: string) => {
    if (!confirm("সদস্য মুছে ফেলতে নিশ্চিত?") return;
    await remove("committee_members", id);
    toast.success("সদস্য মুছে ফেলা হয়েছে");
    fetchAll();
  };

  // ------- Contribution actions ------------------------------------------
  const addContribution = async (c: Partial<Contribution>) => {
    await upsert("committee_contributions", c);
    toast.success("অনুদান যুক্ত হয়েছে");
    fetchAll();
  };
  const editContribution = async (c: Contribution) => {
    await upsert("committee_contributions", c);
    toast.success("অনুদান আপডেট হয়েছে");
    fetchAll();
  };
  const deleteContribution = async (id: string) => {
    if (!confirm("অনুদান মুছে ফেলতে নিশ্চিত?") return;
    await remove("committee_contributions", id);
    toast.success("অনুদান মুছে ফেলা হয়েছে");
    fetchAll();
  };

  // ------- Expense actions -----------------------------------------------
  const addExpense = async (e: Partial<Expense>) => {
    await upsert("committee_expenses", e);
    toast.success("খরচ যুক্ত হয়েছে");
    fetchAll();
  };
  const editExpense = async (e: Expense) => {
    await upsert("committee_expenses", e);
    toast.success("খরচ আপডেট হয়েছে");
    fetchAll();
  };
  const deleteExpense = async (id: string) => {
    if (!confirm("খরচ মুছে ফেলতে নিশ্চিত?") ) return;
    await remove("committee_expenses", id);
    toast.success("খরচ মুছে ফেলা হয়েছে");
    fetchAll();
  };

  // ------- UI helpers ---------------------------------------------------
  const renderTable = (title: string, headers: string[], rows: JSX.Element[]) => (
    <div className="bg-card p-4 rounded-xl shadow-lg mb-8">
      <h3 className="text-lg font-bold text-gold mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border border-gold/10">
          <thead className="bg-gold/5 text-gold font-bold">
            <tr>{headers.map((h,i)=> <th key={i} className="p-2">{h}</th>)}</tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Members */}
      {renderTable(
        "সদস্যাবলি",
        ["", "নাম", "এলাকা", "ফোন", "পদবী", "অ্যাকশন"],
        members.map(m => (
          <tr key={m.id} className="border-b border-gold/5 hover:bg-gold/5">
            <td className="p-2"><Edit className="cursor-pointer" onClick={() => {
              const name = prompt("নতুন নাম", m.name) ?? m.name;
              const area = prompt("নতুন এলাকা", m.area) ?? m.area;
              editMember({ ...m, name, area });
            }}/></td>
            <td className="p-2 font-bold">{m.name}</td>
            <td className="p-2 text-muted-foreground">{m.area}</td>
            <td className="p-2">{m.phone || "-"}</td>
            <td className="p-2">{m.designation || "-"}</td>
            <td className="p-2">
              <Trash2 className="text-red-600 cursor-pointer" onClick={() => deleteMember(m.id)} />
            </td>
          </tr>
        ))
      )}
      <div className="flex justify-end mb-6">
        <button onClick={() => addMember({ name: "নতুন যুক্তি", area: "" })} className="flex items-center gap-2 bg-gold text-primary-foreground px-4 py-2 rounded-xl font-bold">
          <Plus size={16} /> সদস্য যোগ করুন
        </button>
      </div>

      {/* Contributions */}
      {renderTable(
        "অনুদান রেকর্ড",
        ["", "নাম", "এলাকা", "মাস", "পরিমাণ", "অ্যাকশন"],
        contributions.map(c => (
          <tr key={c.id} className="border-b border-gold/5 hover:bg-gold/5">
            <td className="p-2"><Edit className="cursor-pointer" onClick={() => {
              const amountStr = prompt("নতুন পরিমাণ", c.amount.toString());
              const amount = amountStr ? Number(amountStr) : c.amount;
              editContribution({ ...c, amount });
            }}/></td>
            <td className="p-2 font-bold">{c.name}</td>
            <td className="p-2 text-muted-foreground">{c.area}</td>
            <td className="p-2">{formatMonthBn(c.target_month)}</td>
            <td className="p-2 font-black text-emerald-600">৳{c.amount.toLocaleString("bn-BD")}</td>
            <td className="p-2"><Trash2 className="text-red-600 cursor-pointer" onClick={() => deleteContribution(c.id)} /></td>
          </tr>
        ))
      )}
      <div className="flex justify-end mb-6">
        <button onClick={() => addContribution({ name: "নতুন", area: "", amount: 0, target_month: new Date().toISOString().slice(0,7) })}
          className="flex items-center gap-2 bg-gold text-primary-foreground px-4 py-2 rounded-xl font-bold">
          <Plus size={16} /> অনুদান যুক্ত করুন
        </button>
      </div>

      {/* Expenses */}
      {renderTable(
        "খরচ রেকর্ড",
        ["", "শিরোনাম", "পরিমাণ", "তারিখ", "অ্যাকশন"],
        expenses.map(e => (
          <tr key={e.id} className="border-b border-gold/5 hover:bg-gold/5">
            <td className="p-2"><Edit className="cursor-pointer" onClick={() => {
              const amountStr = prompt("নতুন পরিমাণ", e.amount.toString());
              const amount = amountStr ? Number(amountStr) : e.amount;
              editExpense({ ...e, amount });
            }}/></td>
            <td className="p-2 font-bold">{e.title}</td>
            <td className="p-2 text-red-600">৳{e.amount.toLocaleString("bn-BD")}</td>
            <td className="p-2">{new Date(e.date).toLocaleDateString("bn-BD")}</td>
            <td className="p-2"><Trash2 className="text-red-600 cursor-pointer" onClick={() => deleteExpense(e.id)} /></td>
          </tr>
        ))
      )}
      <div className="flex justify-end mb-6">
        <button onClick={() => addExpense({ title: "নতুন খরচ", amount: 0, date: new Date().toISOString().slice(0,10) })}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold">
          <Plus size={16} /> খরচ যুক্ত করুন
        </button>
      </div>
    </div>
  );
};

export default AdminEditor;
