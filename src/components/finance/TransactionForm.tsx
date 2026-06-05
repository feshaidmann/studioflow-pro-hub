import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  artistIncomeCategories,
  artistExpenseCategories,
} from "@/constants/transactionCategories";
import { type Transaction, type TransactionType } from "@/data/mockData";
import { toast } from "sonner";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedProjectId?: string;
  editTransaction?: Transaction | null;
  prefillDescription?: string;
  prefillDate?: string;
  prefillCategory?: string;
}

export default function TransactionForm({
  open,
  onOpenChange,
  lockedProjectId,
  editTransaction,
  prefillDescription,
  prefillDate,
  prefillCategory,
}: TransactionFormProps) {
  const { t } = useLanguage();
  const { projects, addTransaction, updateTransaction } = useProjects();

  const [type, setType] = useState<TransactionType>("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [projectId, setProjectId] = useState(lockedProjectId || "none");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    if (editTransaction) {
      setType(editTransaction.type);
      setDescription(editTransaction.description);
      setAmount(String(editTransaction.amount));
      setDate(editTransaction.date ? new Date(editTransaction.date + "T12:00:00") : new Date());
      setProjectId(editTransaction.projectId || "none");
      setCategory(editTransaction.category);
      setCustomCategory(editTransaction.customCategory ?? "");
      setPaid(editTransaction.paid ?? false);
      setNotes(editTransaction.notes ?? "");
    } else {
      setType("income");
      setDescription(prefillDescription ?? "");
      setAmount("");
      setDate(prefillDate ? new Date(prefillDate + "T12:00:00") : new Date());
      setProjectId(lockedProjectId || "none");
      setCategory(prefillCategory ?? "");
      setCustomCategory("");
      setPaid(false);
      setNotes("");
    }
  }, [editTransaction, lockedProjectId, open, prefillDescription, prefillDate, prefillCategory]);

  const categories = type === "income" ? artistIncomeCategories : artistExpenseCategories;

  const handleSave = useCallback(async () => {
    setSubmitted(true);
    if (!description.trim() || !amount || Number(amount) <= 0 || !category) return;
    if (category === "Outros" && !customCategory.trim()) return;
    setSaving(true);
    const payload = {
      type,
      description: description.trim(),
      amount: Number(amount),
      date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      projectId: projectId === "none" ? "" : projectId,
      category,
      customCategory: category === "Outros" ? customCategory.trim() : "",
      paid,
      notes: notes.trim(),
    };
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, payload);
        toast.success(t("finance.updated"));
        onOpenChange(false);
      } else {
        const ok = await addTransaction(payload);
        if (ok) {
          toast.success(t("finance.created"));
          onOpenChange(false);
        } else {
          toast.error(t("finance.saveError"));
        }
      }
    } catch {
      toast.error(t("finance.saveError"));
    } finally {
      setSaving(false);
    }
  }, [description, amount, projectId, category, customCategory, type, date, paid, notes, editTransaction, addTransaction, updateTransaction, t, onOpenChange]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleSave]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTransaction ? t("finance.editTransaction") : t("finance.newTransaction")}</DialogTitle>
          <DialogDescription>{t("finance.formDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              className={cn("flex-1 active:scale-95 transition-transform", type === "income" && "bg-success hover:bg-success/90 text-success-foreground")}
              onClick={() => { setType("income"); setCategory(""); setCustomCategory(""); }}
            >
              {t("finance.income")}
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              className={cn("flex-1 active:scale-95 transition-transform", type === "expense" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}
              onClick={() => { setType("expense"); setCategory(""); setCustomCategory(""); }}
            >
              {t("finance.expense")}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{t("finance.description")} *</Label>
            <Input
              placeholder="Ex: Show no Sesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
            {submitted && !description.trim() && (
              <p className="text-xs text-destructive">{t("finance.descRequired")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("finance.amount")} *</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono-nums"
                min="0"
                step="0.01"
              />
              {submitted && (!amount || Number(amount) <= 0) && (
                <p className="text-xs text-destructive">{t("finance.amountRequired")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("finance.date")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-between font-normal", !date && "text-muted-foreground")}
                  >
                    {date ? format(date, "dd/MM/yyyy") : t("finance.selectDate")}
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Paid toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="paid-toggle" className="cursor-pointer">{t("finance.status")}</Label>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", paid ? "text-success" : "text-muted-foreground")}>
                {paid ? t("finance.paidOn") : t("finance.paidOff")}
              </span>
              <Switch id="paid-toggle" checked={paid} onCheckedChange={setPaid} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("finance.category")} *</Label>
            <Select
              value={category}
              onValueChange={(v) => { setCategory(v); if (v !== "Outros") setCustomCategory(""); }}
            >
              <SelectTrigger><SelectValue placeholder={t("finance.selectCategory")} /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && !category && (
              <p className="text-xs text-destructive">{t("finance.categoryRequired")}</p>
            )}
          </div>

          {category === "Outros" && (
            <div className="space-y-1.5">
              <Label>{t("finance.customCategory")} *</Label>
              <Input
                placeholder={t("finance.customCategoryPlaceholder")}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                autoFocus
                maxLength={100}
              />
              {submitted && !customCategory.trim() && (
                <p className="text-xs text-destructive">{t("finance.customCategoryRequired")}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t("finance.project")} <span className="text-muted-foreground text-xs">{t("finance.optional")}</span></Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!!lockedProjectId}>
              <SelectTrigger><SelectValue placeholder={t("finance.noProject")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("finance.noProject")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("finance.notes")} <span className="text-muted-foreground text-xs">{t("finance.optional")}</span></Label>
            <Textarea
              placeholder="Notas internas, referências, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("finance.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="active:scale-95 transition-transform" title="Ctrl+Enter">
            {saving ? t("finance.saving") : t("finance.saveTransaction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
