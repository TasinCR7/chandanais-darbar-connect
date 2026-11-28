import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  Download,
  FileImage,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Copy,
  ShieldCheck,
  Sparkles,
  Loader2,
  Phone,
  Hash,
  Languages,
} from "lucide-react";
import SEO from "@/components/SEO";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificatePreviewFrame } from "@/components/CertificatePreviewFrame";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneNumber } from "@/utils/phoneUtils";
import {
  createEmptyCertificate,
  DEFAULT_SIGNATORY_NAME,
  DEFAULT_SIGNATORY_NAME_EN,
  DEFAULT_SIGNATORY_TITLE,
  DEFAULT_SIGNATORY_TITLE_EN,
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

const Certificates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = (searchParams.get("code") || "").trim();
  const [activeTab, setActiveTab] = useState<string>(initialCode ? "verify" : "create");

  // Generator state
  const [form, setForm] = useState<VolunteerCertificate>(createEmptyCertificate);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const createExportRef = useRef<HTMLDivElement>(null);

  // Verification / Lookup state
  const [searchMode, setSearchMode] = useState<"code" | "phone">("code");
  const [query, setQuery] = useState(initialCode);
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [verifiedList, setVerifiedList] = useState<VolunteerCertificate[]>([]);
  const [selectedVerified, setSelectedVerified] = useState<VolunteerCertificate | null>(null);
  const [verifyExporting, setVerifyExporting] = useState<"pdf" | "png" | null>(null);
  const verifyExportRef = useRef<HTMLDivElement>(null);

  const { isStaff, user } = useAuth();
  const { toast } = useToast();

  // Auto-verify if ?code=... is present in URL (e.g. from QR code scan)
  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    const run = async () => {
      setSearching(true);
      setSearchAttempted(true);
      try {
        const { data, error } = await (supabase.rpc as any)("verify_volunteer_certificate", {
          p_code: initialCode,
        });
        if (cancelled) return;
        if (error) {
          console.error("Verify certificate RPC error:", error);
          setVerifiedList([]);
          setSelectedVerified(null);
        } else {
          const rows = (Array.isArray(data) ? data : data ? [data] : []) as VolunteerCertificate[];
          setVerifiedList(rows);
          setSelectedVerified(rows[0] ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Verify error:", err);
          setVerifiedList([]);
          setSelectedVerified(null);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  const handleFieldChange = <K extends keyof VolunteerCertificate>(
    key: K,
    value: VolunteerCertificate[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (savedCode) setSavedCode(null);
  };

  const handleLanguageSwitch = (nextLang: CertificateLanguage) => {
    setForm((prev) => {
      const toEn = nextLang === "en";
      const fromRoles = toEn ? VOLUNTEER_ROLE_PRESETS : VOLUNTEER_ROLE_PRESETS_EN;
      const toRoles = toEn ? VOLUNTEER_ROLE_PRESETS_EN : VOLUNTEER_ROLE_PRESETS;
      const fromEvents = toEn ? EVENT_PRESETS : EVENT_PRESETS_EN;
      const toEvents = toEn ? EVENT_PRESETS_EN : EVENT_PRESETS;

      const roleIdx = fromRoles.indexOf(prev.role_title);
      const eventIdx = fromEvents.indexOf(prev.event_name);

      const nextSignatoryName =
        prev.signatory_name === (toEn ? DEFAULT_SIGNATORY_NAME : DEFAULT_SIGNATORY_NAME_EN)
          ? toEn
            ? DEFAULT_SIGNATORY_NAME_EN
            : DEFAULT_SIGNATORY_NAME
          : prev.signatory_name;

      const nextSignatoryTitle =
        prev.signatory_title === (toEn ? DEFAULT_SIGNATORY_TITLE : DEFAULT_SIGNATORY_TITLE_EN)
          ? toEn
            ? DEFAULT_SIGNATORY_TITLE_EN
            : DEFAULT_SIGNATORY_TITLE
          : prev.signatory_title;

      return {
        ...prev,
        language: nextLang,
        role_title: roleIdx >= 0 ? toRoles[roleIdx] : prev.role_title,
        event_name: eventIdx >= 0 ? toEvents[eventIdx] : prev.event_name,
        signatory_name: nextSignatoryName,
        signatory_title: nextSignatoryTitle,
      };
    });
    if (savedCode) setSavedCode(null);
  };

  const isEn = form.language === "en";
  const rolePresets = isEn ? VOLUNTEER_ROLE_PRESETS_EN : VOLUNTEER_ROLE_PRESETS;
  const eventPresets = isEn ? EVENT_PRESETS_EN : EVENT_PRESETS;

  const handleRegenerateCode = () => {
    setForm((prev) => ({ ...prev, certificate_code: generateCertificateCode() }));
    setSavedCode(null);
  };

  const handleExport = async (
    kind: "pdf" | "png",
    cert: VolunteerCertificate,
    refObj: React.RefObject<HTMLDivElement>,
    setBusy: (v: "pdf" | "png" | null) => void
  ) => {
    if (!cert.volunteer_name.trim()) {
      toast({
        title: "নাম আবশ্যক",
        description: "সার্টিফিকেট ডাউনলোড করতে স্বেচ্ছাসেবকের নাম লিখুন।",
        variant: "destructive",
      });
      return;
    }
    if (!refObj.current) return;

    setBusy(kind);
    try {
      if (kind === "pdf") {
        await downloadCertificatePDF(refObj.current, cert);
      } else {
        await downloadCertificatePNG(refObj.current, cert);
      }
      toast({
        title: kind === "pdf" ? "PDF ডাউনলোড সম্পন্ন" : "ছবি (PNG) ডাউনলোড সম্পন্ন",
        description: `${cert.volunteer_name} — ${cert.certificate_code}`,
      });
    } catch (err) {
      console.error("Certificate export error:", err);
      toast({
        title: "ডাউনলোড ব্যর্থ",
        description: "সার্টিফিকেট তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!isStaff) {
      toast({
        title: "অ্যাডমিন লগইন প্রয়োজন",
        description: "অফিসিয়াল ডাটাবেসে সনদ সংরক্ষণ করতে অ্যাডমিন হিসেবে লগইন করুন।",
        variant: "destructive",
      });
      return;
    }
    if (!form.volunteer_name.trim() || !form.event_name.trim() || !form.certificate_code.trim()) {
      toast({
        title: "তথ্য অসম্পূর্ণ",
        description: "স্বেচ্ছাসেবকের নাম, অনুষ্ঠানের নাম এবং সনদ নম্বর আবশ্যক।",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = form.phone?.trim() ? normalizePhoneNumber(form.phone) : null;
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
        created_by: user?.id ?? null,
      };

      const { error } = await (supabase.from as any)("volunteer_certificates").insert([payload]);
      if (error) throw error;

      setSavedCode(payload.certificate_code);
      toast({
        title: "অফিসিয়াল সনদ সংরক্ষিত হয়েছে",
        description: `সনদ নম্বর: ${payload.certificate_code} — এখন QR কোড দিয়ে যাচাই করা যাবে।`,
      });
    } catch (err: any) {
      console.error("Save certificate error:", err);
      toast({
        title: "সংরক্ষণ ব্যর্থ",
        description:
          err?.message?.includes("duplicate")
            ? "এই সনদ নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে। নতুন কোড তৈরি করুন।"
            : err?.message || "ডাটাবেসে সংরক্ষণ করা যায়নি।",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyVerifyLink = (code: string) => {
    const url = getCertificateVerifyUrl(code);
    navigator.clipboard?.writeText(url).then(() => {
      toast({
        title: "ভেরিফিকেশন লিংক কপি হয়েছে",
        description: url,
      });
    });
  };

  const handleVerifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setSearchAttempted(true);
    try {
      if (searchMode === "code") {
        setSearchParams({ code: trimmed.toUpperCase() }, { replace: true });
        const { data, error } = await (supabase.rpc as any)("verify_volunteer_certificate", {
          p_code: trimmed,
        });
        if (error) throw error;
        const rows = (Array.isArray(data) ? data : data ? [data] : []) as VolunteerCertificate[];
        setVerifiedList(rows);
        setSelectedVerified(rows[0] ?? null);
      } else {
        const cleanPhone = normalizePhoneNumber(trimmed);
        if (cleanPhone.length < 10) {
          toast({
            title: "সঠিক নম্বর দিন",
            description: "কমপক্ষে ১০-১১ ডিজিটের মোবাইল নম্বর লিখুন।",
            variant: "destructive",
          });
          setSearching(false);
          return;
        }
        const { data, error } = await (supabase.rpc as any)(
          "search_volunteer_certificates_by_phone",
          { p_phone: cleanPhone }
        );
        if (error) throw error;
        const rows = (Array.isArray(data) ? data : data ? [data] : []) as VolunteerCertificate[];
        setVerifiedList(rows);
        setSelectedVerified(rows[0] ?? null);
      }
    } catch (err: any) {
      console.error("Certificate search error:", err);
      toast({
        title: "অনুসন্ধান ব্যর্থ",
        description: err?.message || "সার্টিফিকেট খুঁজতে সমস্যা হয়েছে।",
        variant: "destructive",
      });
      setVerifiedList([]);
      setSelectedVerified(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <SEO
        title="স্বেচ্ছাসেবক সার্টিফিকেট পোর্টাল"
        description="চন্দনাইশ দরবার শরীফের স্বেচ্ছাসেবকদের সম্মাননা সনদপত্র তৈরি, ডাউনলোড এবং অনলাইন QR কোড যাচাই পোর্টাল।"
        keywords="স্বেচ্ছাসেবক সার্টিফিকেট, চন্দনাইশ দরবার শরীফ সনদ, volunteer certificate, ওরশ স্বেচ্ছাসেবক"
        canonical="/certificates"
      />

      <div className="py-14 md:py-20 islamic-pattern min-h-screen font-bengali">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionTitle
            arabic="شَهَادَةُ تَقْدِير"
            title="স্বেচ্ছাসেবক সার্টিফিকেট পোর্টাল"
            subtitle="দরবার শরীফের সম্মানিত স্বেচ্ছাসেবকদের জন্য সম্মাননা সনদপত্র তৈরি, ডাউনলোড ও অনলাইন যাচাই করুন"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid grid-cols-2 max-w-lg mx-auto bg-card/60 border border-gold/25 p-1.5 rounded-2xl h-auto">
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                সনদ তৈরি করুন
              </TabsTrigger>
              <TabsTrigger
                value="verify"
                className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                যাচাই ও ডাউনলোড
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CERTIFICATE GENERATOR */}
            <TabsContent value="create" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Form */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lg:col-span-5 bg-card/80 border border-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-gold" />
                      <h2 className="text-lg font-heading font-bold text-cream">
                        {isEn ? "Volunteer Details" : "স্বেচ্ছাসেবকের তথ্য দিন"}
                      </h2>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setForm(createEmptyCertificate(form.language || "bn"));
                        setSavedCode(null);
                      }}
                      className="text-xs text-gold/70 hover:text-gold"
                    >
                      {isEn ? "Reset" : "রিসেট"}
                    </Button>
                  </div>

                    {/* Certificate Language Switcher */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80 flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5" /> সার্টিফিকেটের ভাষা / Certificate Language
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleLanguageSwitch("bilingual")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          (form.language || "bilingual") === "bilingual"
                            ? "bg-gold-gradient text-primary-foreground border-gold shadow-sm"
                            : "bg-background/50 border-gold/20 text-muted-foreground hover:text-cream"
                        }`}
                      >
                        বাংলা + EN
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageSwitch("bn")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          form.language === "bn"
                            ? "bg-gold-gradient text-primary-foreground border-gold shadow-sm"
                            : "bg-background/50 border-gold/20 text-muted-foreground hover:text-cream"
                        }`}
                      >
                        শুধু বাংলা
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageSwitch("en")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          form.language === "en"
                            ? "bg-gold-gradient text-primary-foreground border-gold shadow-sm"
                            : "bg-background/50 border-gold/20 text-muted-foreground hover:text-cream"
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Certificate Code */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80">সনদ নম্বর (Certificate ID) *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.certificate_code}
                        onChange={(e) =>
                          handleFieldChange("certificate_code", e.target.value.toUpperCase())
                        }
                        className="font-mono text-sm bg-background/60 border-gold/20"
                        maxLength={40}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleRegenerateCode}
                        title="নতুন কোড তৈরি করুন"
                        className="border-gold/30 text-gold shrink-0"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Volunteer Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80">স্বেচ্ছাসেবকের পূর্ণ নাম *</Label>
                    <Input
                      value={form.volunteer_name}
                      onChange={(e) => handleFieldChange("volunteer_name", e.target.value)}
                      placeholder="যেমন: মোঃ আবদুল করিম"
                      className="bg-background/60 border-gold/20"
                      maxLength={100}
                    />
                  </div>

                  {/* Father Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">পিতার নাম (ঐচ্ছিক)</Label>
                      <Input
                        value={form.father_name || ""}
                        onChange={(e) => handleFieldChange("father_name", e.target.value)}
                        placeholder="পিতার নাম"
                        className="bg-background/60 border-gold/20"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">মোবাইল নম্বর (ঐচ্ছিক)</Label>
                      <Input
                        value={form.phone || ""}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        placeholder="০১XXXXXXXXX"
                        className="bg-background/60 border-gold/20 font-mono"
                        maxLength={20}
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80">ঠিকানা / এলাকা (ঐচ্ছিক)</Label>
                    <Input
                      value={form.address || ""}
                      onChange={(e) => handleFieldChange("address", e.target.value)}
                      placeholder="যেমন: চন্দনাইশ, চট্টগ্রাম"
                      className="bg-background/60 border-gold/20"
                      maxLength={120}
                    />
                  </div>

                  {/* Role Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80">
                      {isEn ? "Role / Designation *" : "দায়িত্ব / পদবী *"}
                    </Label>
                    <select
                      value={
                        rolePresets.includes(form.role_title)
                          ? form.role_title
                          : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "__custom__") {
                          handleFieldChange("role_title", e.target.value);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-md bg-background/60 border border-gold/20 text-sm text-foreground"
                    >
                      {rolePresets.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      <option value="__custom__">
                        {isEn ? "Other (Type below)" : "অন্যান্য (নিচে লিখুন)"}
                      </option>
                    </select>
                    <Input
                      value={form.role_title}
                      onChange={(e) => handleFieldChange("role_title", e.target.value)}
                      placeholder={isEn ? "Enter role title" : "দায়িত্ব লিখুন"}
                      className="bg-background/60 border-gold/20 text-sm"
                      maxLength={80}
                    />
                  </div>

                  {/* Event Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold/80">
                      {isEn ? "Event / Occasion *" : "অনুষ্ঠান / উপলক্ষ *"}
                    </Label>
                    <select
                      value={
                        eventPresets.includes(form.event_name)
                          ? form.event_name
                          : "__custom__"
                      }
                      onChange={(e) => {
                        if (e.target.value !== "__custom__") {
                          handleFieldChange("event_name", e.target.value);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-md bg-background/60 border border-gold/20 text-sm text-foreground"
                    >
                      {eventPresets.map((ev) => (
                        <option key={ev} value={ev}>
                          {ev}
                        </option>
                      ))}
                      <option value="__custom__">
                        {isEn ? "Other (Type below)" : "অন্যান্য (নিচে লিখুন)"}
                      </option>
                    </select>
                    <Input
                      value={form.event_name}
                      onChange={(e) => handleFieldChange("event_name", e.target.value)}
                      placeholder={isEn ? "Enter event name" : "অনুষ্ঠানের নাম লিখুন"}
                      className="bg-background/60 border-gold/20 text-sm"
                      maxLength={140}
                    />
                  </div>

                  {/* Service Period & Issue Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">সেবার সময়কাল (ঐচ্ছিক)</Label>
                      <Input
                        value={form.service_period || ""}
                        onChange={(e) => handleFieldChange("service_period", e.target.value)}
                        placeholder="যেমন: ১৬ই ফাল্গুন ১৪৩৩"
                        className="bg-background/60 border-gold/20"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">ইস্যু তারিখ *</Label>
                      <Input
                        type="date"
                        value={form.issue_date}
                        onChange={(e) => handleFieldChange("issue_date", e.target.value)}
                        className="bg-background/60 border-gold/20"
                      />
                    </div>
                  </div>

                  {/* Signatory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">স্বাক্ষরকারীর নাম</Label>
                      <Input
                        value={form.signatory_name}
                        onChange={(e) => handleFieldChange("signatory_name", e.target.value)}
                        className="bg-background/60 border-gold/20 text-xs"
                        maxLength={120}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gold/80">স্বাক্ষরকারীর পদবী</Label>
                      <Input
                        value={form.signatory_title}
                        onChange={(e) => handleFieldChange("signatory_title", e.target.value)}
                        className="bg-background/60 border-gold/20 text-xs"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Right Live Preview & Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="lg:col-span-7 space-y-4"
                >
                  <div className="bg-card/80 border border-gold/20 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-heading font-bold text-gold flex items-center gap-2">
                        <Award className="w-4 h-4" /> লাইভ সার্টিফিকেট প্রিভিউ (A4 Landscape)
                      </h3>
                      {savedCode && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ডাটাবেসে সংরক্ষিত
                        </span>
                      )}
                    </div>

                    <CertificatePreviewFrame
                      certificate={form}
                      exportRef={createExportRef}
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() =>
                          handleExport("pdf", form, createExportRef, setExporting)
                        }
                        disabled={exporting !== null}
                        className="flex-1 min-w-[160px] bg-gold-gradient text-primary-foreground font-bold"
                      >
                        {exporting === "pdf" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        PDF ডাউনলোড (A4)
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleExport("png", form, createExportRef, setExporting)
                        }
                        disabled={exporting !== null}
                        className="flex-1 min-w-[160px] border-gold/30 text-gold hover:bg-gold/10 font-bold"
                      >
                        {exporting === "png" ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileImage className="w-4 h-4 mr-2" />
                        )}
                        ছবি (PNG) ডাউনলোড
                      </Button>

                      {isStaff && (
                        <Button
                          type="button"
                          onClick={handleSaveToDatabase}
                          disabled={saving || !!savedCode}
                          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          {savedCode ? "সংরক্ষিত হয়েছে" : "অফিসিয়াল সনদ সংরক্ষণ করুন"}
                        </Button>
                      )}
                    </div>

                    {savedCode && (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-xs">
                        <span className="text-emerald-300">
                          ভেরিফিকেশন কোড: <strong className="font-mono">{savedCode}</strong>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyVerifyLink(savedCode)}
                          className="text-emerald-300 hover:text-emerald-200 h-7 px-2"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> লিংক কপি করুন
                        </Button>
                      </div>
                    )}

                    {!isStaff && (
                      <div className="text-xs text-muted-foreground bg-muted/30 border border-gold/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          অফিসিয়াল QR ভেরিফিকেশনের জন্য ডাটাবেসে সনদ সংরক্ষণ করতে অ্যাডমিন লগইন প্রয়োজন।
                        </span>
                        <Link
                          to="/admin"
                          className="text-gold hover:underline font-semibold shrink-0"
                        >
                          অ্যাডমিন প্যানেল →
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </TabsContent>

            {/* TAB 2: VERIFY & DOWNLOAD */}
            <TabsContent value="verify" className="space-y-6">
              <div className="max-w-2xl mx-auto bg-card/80 border border-gold/25 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode("code");
                      setQuery("");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      searchMode === "code"
                        ? "bg-gold/15 border-gold text-gold"
                        : "border-gold/15 text-muted-foreground hover:text-cream"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" /> সনদ নম্বর দিয়ে
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode("phone");
                      setQuery("");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      searchMode === "phone"
                        ? "bg-gold/15 border-gold text-gold"
                        : "border-gold/15 text-muted-foreground hover:text-cream"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" /> মোবাইল নম্বর দিয়ে
                  </button>
                </div>

                <form onSubmit={handleVerifySearch} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      searchMode === "code"
                        ? "সনদ নম্বর লিখুন (যেমন: CDS-VOL-2026-XXXXX)"
                        : "নিবন্ধিত মোবাইল নম্বর লিখুন (যেমন: ০১৭XXXXXXXX)"
                    }
                    className="bg-background/60 border-gold/25 font-mono text-base h-11"
                  />
                  <Button
                    type="submit"
                    disabled={searching || !query.trim()}
                    className="bg-gold-gradient text-primary-foreground font-bold h-11 px-6 shrink-0"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    যাচাই করুন
                  </Button>
                </form>
              </div>

              {/* Search Results */}
              {searchAttempted && !searching && verifiedList.length === 0 && (
                <div className="max-w-2xl mx-auto bg-card/60 border border-destructive/30 rounded-2xl p-8 text-center">
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-cream mb-1">
                    কোনো সনদ পাওয়া যায়নি
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    অনুগ্রহ করে সঠিক সনদ নম্বর বা মোবাইল নম্বর দিয়ে আবার চেষ্টা করুন।
                  </p>
                </div>
              )}

              {verifiedList.length > 1 && (
                <div className="max-w-4xl mx-auto flex flex-wrap gap-2 justify-center">
                  {verifiedList.map((item) => (
                    <button
                      key={item.certificate_code}
                      type="button"
                      onClick={() => setSelectedVerified(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedVerified?.certificate_code === item.certificate_code
                          ? "bg-gold-gradient text-primary-foreground border-gold"
                          : "bg-card/60 border-gold/20 text-cream hover:border-gold/50"
                      }`}
                    >
                      {item.event_name} ({item.certificate_code})
                    </button>
                  ))}
                </div>
              )}

              {selectedVerified && (
                <div className="max-w-4xl mx-auto bg-card/80 border border-gold/25 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/15 pb-4">
                    <div className="flex items-center gap-3">
                      {selectedVerified.status === "revoked" ? (
                        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 px-3.5 py-1.5 rounded-full text-sm font-bold">
                          <XCircle className="w-4 h-4" /> বাতিলকৃত সনদ (Revoked)
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-sm font-bold">
                          <CheckCircle2 className="w-4 h-4" /> যাচাইকৃত অফিসিয়াল সনদ ✓
                        </div>
                      )}
                      <span className="font-mono text-xs text-gold">
                        {selectedVerified.certificate_code}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-lg border border-gold/25 overflow-hidden">
                        {(
                          [
                            { id: "bilingual", label: "বাংলা+EN" },
                            { id: "bn", label: "বাংলা" },
                            { id: "en", label: "English" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setSelectedVerified({ ...selectedVerified, language: opt.id })
                            }
                            className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                              (selectedVerified.language || "bilingual") === opt.id
                                ? "bg-gold text-primary-foreground"
                                : "bg-background/60 text-muted-foreground hover:text-cream"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyVerifyLink(selectedVerified.certificate_code)}
                        className="border-gold/30 text-gold"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> লিংক কপি
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          handleExport(
                            "pdf",
                            selectedVerified,
                            verifyExportRef,
                            setVerifyExporting
                          )
                        }
                        disabled={verifyExporting !== null}
                        className="bg-gold-gradient text-primary-foreground font-bold"
                      >
                        {verifyExporting === "pdf" ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleExport(
                            "png",
                            selectedVerified,
                            verifyExportRef,
                            setVerifyExporting
                          )
                        }
                        disabled={verifyExporting !== null}
                        className="border-gold/30 text-gold"
                      >
                        {verifyExporting === "png" ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <FileImage className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        PNG
                      </Button>
                    </div>
                  </div>

                  <CertificatePreviewFrame
                    certificate={selectedVerified}
                    exportRef={verifyExportRef}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Certificates;
