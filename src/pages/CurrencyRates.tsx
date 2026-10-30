import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Coins,
  Plus,
  Edit2,
  Check,
  X,
  RefreshCw,
  TrendingUp,
  Globe2,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CurrencyRate {
  id: string;
  currency: string;
  label: string;
  symbol: string;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CurrencyRates = () => {
  const queryClient = useQueryClient();

  const [editingRate, setEditingRate] = useState<CurrencyRate | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>("");
  const [editLabelValue, setEditLabelValue] = useState<string>("");
  const [editSymbolValue, setEditSymbolValue] = useState<string>("");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newRate, setNewRate] = useState("");

  const { data, isLoading } = useQuery<{ rates: CurrencyRate[] }>({
    queryKey: ["adminCurrencyRates"],
    queryFn: () => fetchApi("/currency-rates"),
  });

  const rates = data?.rates || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CurrencyRate> }) =>
      fetchApi(`/currency-rates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCurrencyRates"] });
      toast.success("Exchange rate updated successfully");
      setEditingRate(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update currency rate"),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { currency: string; label: string; symbol: string; rate: number }) =>
      fetchApi("/currency-rates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCurrencyRates"] });
      toast.success("New currency added successfully");
      setShowAddDialog(false);
      resetAddForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to add currency rate"),
  });

  const resetAddForm = () => {
    setNewCurrency("");
    setNewLabel("");
    setNewSymbol("");
    setNewRate("");
  };

  const startEdit = (rate: CurrencyRate) => {
    setEditingRate(rate);
    setEditRateValue(String(rate.rate));
    setEditLabelValue(rate.label);
    setEditSymbolValue(rate.symbol);
  };

  const handleSaveEdit = () => {
    if (!editingRate) return;
    const numRate = parseFloat(editRateValue);
    if (isNaN(numRate) || numRate <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }
    if (!editLabelValue.trim()) {
      toast.error("Label cannot be empty");
      return;
    }
    if (!editSymbolValue.trim()) {
      toast.error("Symbol cannot be empty");
      return;
    }

    updateMutation.mutate({
      id: editingRate.id,
      updates: {
        rate: numRate,
        label: editLabelValue.trim(),
        symbol: editSymbolValue.trim(),
      },
    });
  };

  const handleToggleActive = (rate: CurrencyRate) => {
    updateMutation.mutate({
      id: rate.id,
      updates: { is_active: !rate.is_active },
    });
  };

  const handleAddCurrency = () => {
    const code = newCurrency.trim().toUpperCase();
    const label = newLabel.trim();
    const symbol = newSymbol.trim();
    const rateNum = parseFloat(newRate);

    if (!code || code.length < 2 || code.length > 10) {
      toast.error("Currency code must be 2 to 10 uppercase letters (e.g. CAD)");
      return;
    }
    if (!label) {
      toast.error("Label is required (e.g. Canadian Dollar)");
      return;
    }
    if (!symbol) {
      toast.error("Symbol is required (e.g. CA$)");
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }

    addMutation.mutate({
      currency: code,
      label,
      symbol,
      rate: rateNum,
    });
  };

  const activeCount = rates.filter((r) => r.is_active).length;

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Coins className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 mb-1">
                Financial Settings
              </p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Currency Rates</h1>
            </div>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl btn-primary text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" /> Add Currency
          </button>
        </div>

        {/* Stats & Information Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supported Currencies</p>
              <p className="text-2xl font-black text-slate-800">{rates.length}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active in Frontend</p>
              <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Base Anchor</p>
              <p className="text-xl font-black text-slate-800">INR (₹ 1.00)</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 mb-8 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-900 leading-relaxed">
            <span className="font-bold">How Auto-Conversion Works:</span> All template prices are entered in <strong>INR (₹)</strong> as the base anchor.
            When users from other countries browse or checkout, prices are dynamically computed as <code className="bg-white/80 px-1.5 py-0.5 rounded text-purple-800 font-mono text-[11px]">Price in INR × Rate</code>.
            Updating an exchange rate here takes effect immediately across all template cards and payment flows.
          </div>
        </div>

        {/* Currency Rates Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-4 px-6">Currency</th>
                  <th className="py-4 px-6">Label / Name</th>
                  <th className="py-4 px-6">Symbol</th>
                  <th className="py-4 px-6">Exchange Rate (1 INR = )</th>
                  <th className="py-4 px-6">Example (₹299)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Last Updated</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                      Loading currency rates…
                    </td>
                  </tr>
                ) : rates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No currency rates found. Add one above.
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => {
                    const isBase = rate.currency === "INR";
                    const calculated = Number((299 * rate.rate).toFixed(2));
                    const examplePrice = calculated.toString();

                    return (
                      <tr
                        key={rate.id}
                        className={`hover:bg-slate-50/60 transition-colors ${!rate.is_active ? "opacity-60 bg-slate-50/30" : ""}`}
                      >
                        {/* Currency Code */}
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-black text-slate-800">
                            {rate.currency}
                          </span>
                        </td>

                        {/* Label */}
                        <td className="py-4 px-6 font-semibold text-slate-800">{rate.label}</td>

                        {/* Symbol */}
                        <td className="py-4 px-6">
                          <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {rate.symbol}
                          </span>
                        </td>

                        {/* Rate */}
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700">
                          {rate.rate.toFixed(6)}
                        </td>

                        {/* Example */}
                        <td className="py-4 px-6">
                          <span className="text-xs font-semibold text-slate-600">
                            {rate.symbol}{examplePrice}
                          </span>
                        </td>

                        {/* Active Switch */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rate.is_active}
                              disabled={isBase || updateMutation.isPending}
                              onCheckedChange={() => handleToggleActive(rate)}
                            />
                            <span className="text-xs font-medium text-slate-500">
                              {rate.is_active ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>

                        {/* Last Updated */}
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {rate.updated_at ? format(new Date(rate.updated_at), "MMM d, yyyy HH:mm") : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => startEdit(rate)}
                            disabled={isBase}
                            className={`p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all ${
                              isBase ? "opacity-30 cursor-not-allowed" : ""
                            }`}
                            title={isBase ? "Base currency cannot be edited" : "Edit rate"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingRate} onOpenChange={(open) => !open && setEditingRate(null)}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Edit {editingRate?.currency} Exchange Rate
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Set conversion factor relative to 1 INR (e.g. 1 INR = 0.011900 USD).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Label
                </label>
                <input
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  placeholder="e.g. US Dollar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Symbol
                </label>
                <input
                  value={editSymbolValue}
                  onChange={(e) => setEditSymbolValue(e.target.value)}
                  placeholder="e.g. $"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Exchange Rate (1 INR = )
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={editRateValue}
                  onChange={(e) => setEditRateValue(e.target.value)}
                  placeholder="e.g. 0.011900"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
                />
                {parseFloat(editRateValue) > 0 && (
                  <p className="text-[11px] text-purple-600 font-medium pt-1">
                    Preview: ₹299 INR = {editSymbolValue}
                    {parseFloat((299 * parseFloat(editRateValue)).toFixed(2))} {editingRate?.currency}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => setEditingRate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl btn-primary text-white text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-1.5"
              >
                {updateMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-[460px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Add Supported Currency
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Register a new international currency for automated conversion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Currency Code
                  </label>
                  <input
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                    placeholder="e.g. CAD"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Symbol
                  </label>
                  <input
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="e.g. CA$"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Label
                </label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Canadian Dollar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Exchange Rate (1 INR = )
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="e.g. 0.016200"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCurrency}
                disabled={addMutation.isPending}
                className="px-5 py-2 rounded-xl btn-primary text-white text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-1.5"
              >
                {addMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Add Currency
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CurrencyRates;
