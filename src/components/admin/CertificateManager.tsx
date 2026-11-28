import React, { useEffect, useRef, useState } from "react";
import {
  Award,
  Plus,
  Download,
  FileImage,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VolunteerCertificateTemplate } from "@/components/VolunteerCertificateTemplate";
import { normalizePhoneNumber } from "@/utils/phoneUtils";
import {
  createEmptyCertificate,
  downloadCertificatePDF,
  downloadCertificatePNG,
  EVENT_PRESETS,
  EVENT_PRESETS_EN,
  generateCertificateCode,
  getCertificateVerifyUrl,
  VOLUNTEER_ROLE_PRESETS,
  VOLUNTEER_ROLE_PRESETS_EN,
  type CertificateLanguage,
  type VolunteerCertificate,
} from "@/lib/certificate";

const CertificateManager: React.FC = () => {
  const [certificates, setCertificates] = useState<VolunteerCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<VolunteerCertificate>(createEmptyCertificate);
  const [exportCert, setExportCert] = useState<VolunteerCertificate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)("volunteer_certificates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCertificates((data as VolunteerCertificate[]) || []);
    } catch (err: any) {
      console.error("Load certificates error:", err);
      toast({
        title: "সার্টিফিকেট লোড হয়নি",
        description: err?.message || "ডাটাবেস টেবিল তৈরি করা আছে কিনা যাচাই করুন।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.volunteer_name.trim() || !form.event_name.trim()) {
      toast({
        title: "তথ্য দিন",
        description: "স্বেচ্ছাসেবকের নাম ও অনুষ্ঠানের নাম আবশ্যক।",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = form.phone?.trim() ? normalizePhoneNumber(form.phone) : null;
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        certificate_code: form.certificate_code.trim().toUpperCase(),
        volunteer_name: form.volunteer_name.trim(),
        father_name: form.father_name?.trim() || null,
        phone: cleanPhone || null,
        address: form.address?.trim() || null,
        role_title: form.role_title.trim() || "স্বেচ্ছাসেবক",
        event_name: form.event_name.trim(),
        service_period: form.service_period?.trim() || null,
        issue_date: form.issue_date,
        signatory_name: form.signatory_name.trim(),
        signatory_title: form.signatory_title.trim(),
        language: form.language || "bn",
        status: "active",
        created_by: userData.user?.id ?? null,
      };

      const { error } = await (supabase.from as any)("volunteer_certificates").insert([payload]);
      if (error) throw error;

      toast({
        title: "সনদ ইস্যু সফল হয়েছে",
        description: `${payload.volunteer_name} — ${payload.certificate_code}`,
      });
      setForm(createEmptyCertificate());
      await fetchCertificates();
    } catch (err: any) {
      toast({
        title: "সনদ ইস্যু ব্যর্থ",
        description: err?.message || "অজানা ত্রুটি হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerDownload = async (cert: VolunteerCertificate, type: "pdf" | "png") => {
    setExportCert(cert);
    setBusyId(`${cert.certificate_code}-${type}`);
    // Wait a tick for hidden template + QR to mount & render
    await new Promise((r) => setTimeout(r, 250));
    try {
      if (!exportRef.current) throw new Error("Template not ready");
      if (type === "pdf") {
        await downloadCertificatePDF(exportRef.current, cert);
      } else {
        await downloadCertificatePNG(exportRef.current, cert);
      }
      toast({ title: type === "pdf" ? "PDF ডাউনলোড হয়েছে" : "PNG ডাউনলোড হয়েছে" });
    } catch (err) {
      console.error("Admin cert download error:", err);
      toast({ title: "ডাউনলোড ব্যর্থ", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (cert: VolunteerCertificate) => {
    if (!cert.id) return;
    const nextStatus = cert.status === "revoked" ? "active" : "revoked";
    const { error } = await (supabase.from as any)("volunteer_certificates")
      .update({ status: nextStatus })
      .eq("id", cert.id);
    if (error) {
      toast({ title: "স্ট্যাটাস পরিবর্তন ব্যর্থ", variant: "destructive" });
    } else {
      toast({
        title: nextStatus === "active" ? "সনদ পুনরায় সক্রিয় হয়েছে" : "সনদ বাতিল (Revoked) করা হয়েছে",
      });
      fetchCertificates();
    }
  };

  const handleDelete = async (cert: VolunteerCertificate) => {
    if (!cert.id) return;
    if (!window.confirm(`"${cert.volunteer_name}" এর সনদ (${cert.certificate_code}) মুছে ফেলবেন?`)) {
      return;
    }
    const { error } = await (supabase.from as any)("volunteer_certificates")
      .delete()
      .eq("id", cert.id);
    if (error) {
      toast({ title: "মুছে ফেলতে ব্যর্থ", variant: "destructive" });
    } else {
      toast({ title: "সনদ মুছে ফেলা হয়েছে" });
      fetchCertificates();
    }
  };

  const filtered = certificates.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.volunteer_name.toLowerCase().includes(q) ||
      c.certificate_code.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      c.event_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Quick Issue Form */}
      <form
        onSubmit={handleIssue}
        className="bg-card/60 border border-gold/20 rounded-2xl p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-heading font-bold text-gold flex items-center gap-2">
            <Award className="w-5 h-5" /> নতুন স্বেচ্ছাসেবক সনদ ইস্যু করুন
          </h3>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-gold/25 overflow-hidden">
              {(
                [
                  { id: "bilingual", label: "বাংলা+EN" },
                  { id: "bn", label: "বাংলা" },
                  { id: "en", label: "English" },
                ] as { id: CertificateLanguage; label: string }[]
              ).map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setForm(createEmptyCertificate(lang.id))}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                    (form.language || "bilingual") === lang.id
                      ? "bg-gold text-primary-foreground"
                      : "bg-background/60 text-muted-foreground hover:text-cream"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <Link
              to="/certificates"
              className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-semibold"
            >
              লাইভ প্রিভিউ পোর্টাল খুলুন <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-cream/80">স্বেচ্ছাসেবকের নাম *</Label>
            <Input
              value={form.volunteer_name}
              onChange={(e) => setForm({ ...form, volunteer_name: e.target.value })}
              placeholder="পূর্ণ নাম"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-cream/80">পিতার নাম</Label>
            <Input
              value={form.father_name || ""}
              onChange={(e) => setForm({ ...form, father_name: e.target.value })}
              placeholder="পিতার নাম (ঐচ্ছিক)"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-cream/80">মোবাইল নম্বর</Label>
            <Input
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="০১XXXXXXXXX"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-cream/80">দায়িত্ব / পদবী *</Label>
            <select
              value={form.role_title}
              onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              className="w-full mt-1 h-10 px-3 rounded-md bg-background border border-input text-sm"
            >
              {(form.language === "en" ? VOLUNTEER_ROLE_PRESETS_EN : VOLUNTEER_ROLE_PRESETS).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-cream/80">অনুষ্ঠান *</Label>
            <Input
              list="admin-cert-events"
              value={form.event_name}
              onChange={(e) => setForm({ ...form, event_name: e.target.value })}
              className="mt-1"
              required
            />
            <datalist id="admin-cert-events">
              {(form.language === "en" ? EVENT_PRESETS_EN : EVENT_PRESETS).map((ev) => (
                <option key={ev} value={ev} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="text-xs text-cream/80">সনদ নম্বর *</Label>
            <div className="flex gap-1.5 mt-1">
              <Input
                value={form.certificate_code}
                onChange={(e) =>
                  setForm({ ...form, certificate_code: e.target.value.toUpperCase() })
                }
                className="font-mono text-xs"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setForm({ ...form, certificate_code: generateCertificateCode() })}
                title="নতুন কোড"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-cream/80">ঠিকানা / এলাকা</Label>
            <Input
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="চন্দনাইশ, চট্টগ্রাম"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-cream/80">সেবার সময়কাল</Label>
            <Input
              value={form.service_period || ""}
              onChange={(e) => setForm({ ...form, service_period: e.target.value })}
              placeholder="১৬ই ফাল্গুন ১৪৩৩"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-cream/80">ইস্যু তারিখ</Label>
            <Input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="bg-gold-gradient text-primary-foreground font-bold"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          অফিসিয়াল সনদ ইস্যু করুন
        </Button>
      </form>

      {/* Issued Certificates List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-heading font-bold text-gold">
            ইস্যুকৃত সনদসমূহ ({certificates.length})
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gold/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নাম, কোড বা ফোন দিয়ে খুঁজুন..."
              className="pl-9 bg-background/60 border-gold/20"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-card/30 rounded-xl border border-gold/10">
            কোনো সনদ পাওয়া যায়নি।
          </p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((cert) => (
              <div
                key={cert.id || cert.certificate_code}
                className="bg-card/40 border border-gold/15 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-cream">{cert.volunteer_name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                      {cert.certificate_code}
                    </span>
                    {cert.status === "revoked" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">
                        বাতিলকৃত
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                        সক্রিয়
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cert.role_title} • {cert.event_name}
                    {cert.phone ? ` • ${cert.phone}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        getCertificateVerifyUrl(cert.certificate_code)
                      );
                      toast({ title: "ভেরিফিকেশন লিংক কপি হয়েছে" });
                    }}
                    className="border-gold/25 text-gold text-xs h-8"
                    title="ভেরিফিকেশন লিংক কপি"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId !== null}
                    onClick={() => triggerDownload(cert, "pdf")}
                    className="border-gold/25 text-gold text-xs h-8"
                  >
                    {busyId === `${cert.certificate_code}-pdf` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId !== null}
                    onClick={() => triggerDownload(cert, "png")}
                    className="border-gold/25 text-gold text-xs h-8"
                  >
                    {busyId === `${cert.certificate_code}-png` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileImage className="w-3.5 h-3.5 mr-1" />
                    )}
                    PNG
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleStatus(cert)}
                    className="h-8 text-xs"
                    title={cert.status === "revoked" ? "সক্রিয় করুন" : "বাতিল করুন"}
                  >
                    {cert.status === "revoked" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(cert)}
                    className="h-8 text-destructive hover:bg-destructive/10"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Off-screen export template */}
      {exportCert && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-20000px",
            left: "-20000px",
            pointerEvents: "none",
            zIndex: -1000,
          }}
        >
          <VolunteerCertificateTemplate ref={exportRef} certificate={exportCert} />
        </div>
      )}
    </div>
  );
};

export default CertificateManager;
