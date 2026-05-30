import { useSeoMeta } from "@unhead/react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/safesale/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { useCurrentSeller } from "@/hooks/useCurrentSeller";
import { useToast } from "@/hooks/useToast";
import { httpApi } from "@/lib/api/http";
import type { ApiSeller } from "@/lib/api";

interface FormState {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankCode: string;
}

const NIGERIAN_BANKS: { code: string; name: string }[] = [
  { code: "000013", name: "GTBank" },
  { code: "000014", name: "First Bank" },
  { code: "000015", name: "Access Bank" },
  { code: "000016", name: "Zenith Bank" },
  { code: "000017", name: "UBA" },
  { code: "000018", name: "WEMA Bank" },
  { code: "000019", name: "Fidelity Bank" },
  { code: "000020", name: "Union Bank" },
  { code: "000021", name: "Opay" },
  { code: "000022", name: "Polaris Bank" },
  { code: "000023", name: "Stanbic IBTC" },
  { code: "000024", name: "Heritage Bank" },
  { code: "000025", name: "Sterling Bank" },
  { code: "000026", name: "Keystone Bank" },
  { code: "000027", name: "Unity Bank" },
  { code: "000028", name: "Jaiz Bank" },
  { code: "000029", name: "SunTrust Bank" },
  { code: "000030", name: "Providus Bank" },
  { code: "000031", name: "VFD MFB" },
  { code: "090753", name: "Bold MFB" },
];

function bankNameToCode(name: string): string {
  const match = NIGERIAN_BANKS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.code ?? name;
}

function bankCodeToName(code: string): string {
  const match = NIGERIAN_BANKS.find((b) => b.code === code);
  return match?.name ?? code;
}

export default function SettingsPage() {
  useSeoMeta({ title: "Settings — SafeSale" });

  const [seller] = useCurrentSeller();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    bankName: "",
    bankAccount: "",
    bankHolder: "",
    bankCode: "",
  });
  const [dirty, setDirty] = useState(false);

  const {
    data: sellerData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["seller", seller?.handle],
    queryFn: async () => {
      if (!seller?.handle) throw new Error("No seller handle");
      return httpApi.getSeller(seller.handle);
    },
    enabled: !!seller?.handle,
  });

  const sellerRecord: ApiSeller | undefined = sellerData?.seller;

  useEffect(() => {
    if (sellerRecord) {
      setForm({
        bankName: sellerRecord.bankName ?? "",
        bankAccount: sellerRecord.bankAccount ?? "",
        bankHolder: sellerRecord.bankHolder ?? "",
        bankCode: sellerRecord.bankCode ?? "",
      });
    }
  }, [sellerRecord]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormState) => {
      if (!seller?.id) throw new Error("Not signed in");
      return httpApi.updateSellerPayout(seller.id, {
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankHolder: data.bankHolder,
        bankCode: data.bankCode || bankNameToCode(data.bankName),
      });
    },
    onSuccess: (res) => {
      setForm({
        bankName: res.seller.bankName ?? "",
        bankAccount: res.seller.bankAccount ?? "",
        bankHolder: res.seller.bankHolder ?? "",
        bankCode: res.seller.bankCode ?? "",
      });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["seller", seller?.handle] });
      toast({
        title: "Bank details saved",
        description: res.seller.bankVerifiedName
          ? `Verified as "${res.seller.bankVerifiedName}"`
          : "Bank details updated.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankName || !form.bankAccount || !form.bankHolder) {
      toast({
        title: "Missing fields",
        description: "Bank name, account number, and account holder are required.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(form);
  };

  const verified = sellerRecord?.bankVerifiedName;
  const hasBank = sellerRecord?.bankName || sellerRecord?.bankAccount;

  return (
    <AppShell title="Settings" subtitle="Payout & bank details">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Bank payout section */}
        <section className="overflow-hidden rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">
              <Building2 className="h-5 w-5 text-ink-soft" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Bank payout details
              </p>
              <p className="text-xs text-ink-soft">
                NGN bank transfers via MavaPay when a buyer releases funds.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load your profile. Make sure you're signed in.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Bank</Label>
                <select
                  id="bankName"
                  value={form.bankCode || form.bankName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const name = bankCodeToName(val);
                    setForm((f) => ({
                      ...f,
                      bankName: name,
                      bankCode: val,
                    }));
                    setDirty(true);
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a bank...</option>
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankAccount">Account number</Label>
                <Input
                  id="bankAccount"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="0123456789"
                  value={form.bankAccount}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, bankAccount: e.target.value.replace(/\D/g, "") }));
                    setDirty(true);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankHolder">Account holder name</Label>
                <Input
                  id="bankHolder"
                  type="text"
                  placeholder="Name as registered with bank"
                  value={form.bankHolder}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, bankHolder: e.target.value }));
                    setDirty(true);
                  }}
                />
              </div>

              {verified && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Name Enquiry verified as <strong>{verified}</strong>
                  </span>
                </div>
              )}

              {hasBank && !verified && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Bank details saved but not yet verified. Save again to
                    re-run Name Enquiry.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !dirty}
                  className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying & saving…
                    </>
                  ) : (
                    "Save bank details"
                  )}
                </Button>
                {!dirty && hasBank && (
                  <span className="text-xs text-ink-soft">No changes</span>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Verification explanation */}
        <p className="px-1 text-[11px] italic leading-relaxed text-ink-soft">
          Your bank details are verified via MavaPay Name Enquiry, which checks
          that the account name matches the bank's records. This verification is
          required before payouts can be processed.
        </p>

        {/* Not signed in */}
        {!seller && (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface">
              <Building2 className="h-6 w-6 text-ink-soft" />
            </div>
            <p className="mt-4 text-base font-semibold text-ink">
              Sign in to manage settings
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Create a SafeSale seller account to configure your bank details
              and receive payouts.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
