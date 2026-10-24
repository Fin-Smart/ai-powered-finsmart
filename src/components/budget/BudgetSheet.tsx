import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BudgetPlan } from '../../budget/budgetPlanner';
import {
  addTransaction,
  createBudget,
  deleteBudget,
  deleteTransaction,
  updateBudget,
  updateTransaction,
} from '../../budget/budgetRepo';
import { useBudgets } from '../../budget/BudgetsProvider';
import { formatMoney } from '../../budget/money';
import { formatDay } from '../../budget/period';
import type { BudgetDraft, BudgetSummary, BudgetTransaction, TransactionDraft } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { dialog } from '../dialog/dialogStore';
import { Sheet } from '../Sheet';
import { errorMessage, toast } from '../toast/toastStore';
import { BudgetForm, newCategoryId } from './BudgetForm';
import { ExpenseForm } from './ExpenseForm';
import { PlannerPanel } from './PlannerPanel';
import { ProgressBar } from './ProgressBar';

export type BudgetSheetTarget = { mode: 'create' } | { mode: 'view'; budgetId: string };

type Screen = { name: 'view' } | { name: 'edit' } | { name: 'plan' } | { name: 'expense'; transaction?: BudgetTransaction };

export function BudgetSheet({ target, onClose }: { target: BudgetSheetTarget | null; onClose: () => void }) {
  const { uid, summaries } = useBudgets();
  const [screen, setScreen] = useState<Screen>({ name: 'view' });
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    setScreen({ name: 'view' });
    setCreatedId(null);
  }, [target]);

  const budgetId = target?.mode === 'view' ? target.budgetId : createdId;
  const summary = summaries.find((item) => item.budget.id === budgetId) ?? null;
  const creating = target?.mode === 'create' && !createdId;

  const title = creating
    ? 'New budget'
    : screen.name === 'edit'
      ? 'Edit budget'
      : screen.name === 'plan'
        ? 'Plan with Smart Coach'
        : screen.name === 'expense'
          ? screen.transaction
            ? 'Edit entry'
            : 'Add expense'
          : (summary?.budget.name ?? 'Budget');

  const run = async (task: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await task();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, failure));
      return false;
    }
  };

  const create = async (draft: BudgetDraft) => {
    if (!uid) return;
    try {
      setCreatedId(await createBudget(uid, draft));
      setScreen({ name: 'view' });
      toast.success('Budget created');
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the budget. Please try again."));
    }
  };

  const save = async (draft: BudgetDraft) => {
    if (!uid || !summary) return;
    if (await run(() => updateBudget(uid, summary.budget.id, draft), 'Budget saved', "Couldn't save the budget.")) {
      setScreen({ name: 'view' });
    }
  };

  const remove = async () => {
    if (!uid || !summary) return;
    const confirmed = await dialog.confirm({
      title: `Delete ${summary.budget.name}?`,
      message: 'This removes the budget and everything recorded in it.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed && (await run(() => deleteBudget(uid, summary.budget.id), 'Budget deleted', "Couldn't delete the budget."))) {
      onClose();
    }
  };

  const saveTransaction = async (draft: TransactionDraft, existing?: BudgetTransaction) => {
    if (!uid || !summary) return;
    const ok = await run(
      () =>
        existing
          ? updateTransaction(uid, summary.budget.id, existing.id, draft)
          : addTransaction(uid, summary.budget.id, draft),
      existing ? 'Entry updated' : draft.direction === 'out' ? 'Expense added' : 'Money in added',
      "Couldn't save this entry.",
    );
    if (ok) setScreen({ name: 'view' });
  };

  const removeTransaction = async (transaction: BudgetTransaction) => {
    if (!uid || !summary) return;
    const confirmed = await dialog.confirm({ title: 'Delete this entry?', confirmLabel: 'Delete', destructive: true });
    if (confirmed && (await run(() => deleteTransaction(uid, summary.budget.id, transaction.id), 'Entry deleted', "Couldn't delete this entry."))) {
      setScreen({ name: 'view' });
    }
  };

  const applyPlan = async (plan: BudgetPlan) => {
    if (!uid || !summary) return;
    const categories = plan.categories.map((item) => ({
      id:
        summary.budget.categories.find((category) => category.name.toLowerCase() === item.name.toLowerCase())?.id ??
        newCategoryId(),
      name: item.name,
      limitCents: item.limitCents,
    }));
    if (await run(() => updateBudget(uid, summary.budget.id, { categories }), 'Plan applied', "Couldn't apply the plan.")) {
      setScreen({ name: 'view' });
    }
  };

  return (
    <Sheet visible={target !== null} title={title} subtitle={summary && screen.name === 'view' ? summary.period.label : undefined} onClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <SheetBody>
          {creating ? (
            <BudgetForm onSubmit={create} />
          ) : !summary ? null : screen.name === 'edit' ? (
            <>
              <BackLink onPress={() => setScreen({ name: 'view' })} />
              <BudgetForm initial={summary.budget} onSubmit={save} onDelete={remove} />
            </>
          ) : screen.name === 'plan' ? (
            <>
              <BackLink onPress={() => setScreen({ name: 'view' })} />
              <PlannerPanel
                kind={summary.budget.kind}
                label={summary.budget.label}
                name={summary.budget.name}
                currency={summary.budget.currency}
                availableCents={summary.budget.availableCents}
                current={summary.budget.categories.map((category) => ({
                  name: category.name,
                  limitCents: category.limitCents,
                  spentCents: summary.spentByCategory[category.id] ?? 0,
                }))}
                onApply={(plan) => void applyPlan(plan)}
              />
            </>
          ) : screen.name === 'expense' ? (
            <>
              <BackLink onPress={() => setScreen({ name: 'view' })} />
              <ExpenseForm
                key={screen.transaction?.id ?? 'new'}
                budget={summary.budget}
                initial={screen.transaction}
                onSubmit={(draft) => saveTransaction(draft, screen.transaction)}
                onDelete={screen.transaction ? () => void removeTransaction(screen.transaction!) : undefined}
              />
            </>
          ) : (
            <BudgetOverview
              summary={summary}
              onAddExpense={() => setScreen({ name: 'expense' })}
              onPlan={() => setScreen({ name: 'plan' })}
              onEdit={() => setScreen({ name: 'edit' })}
              onEditTransaction={(transaction) => setScreen({ name: 'expense', transaction })}
              onDeleteTransaction={(transaction) => void removeTransaction(transaction)}
            />
          )}
        </SheetBody>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

function SheetBody({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme().theme;
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}>
      {children}
    </ScrollView>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  const { colors, typography } = useTheme().theme;
  return (
    <Text
      accessibilityRole="button"
      onPress={onPress}
      suppressHighlighting
      style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
      ‹ Back
    </Text>
  );
}

type BudgetOverviewProps = {
  summary: BudgetSummary;
  onAddExpense: () => void;
  onPlan: () => void;
  onEdit: () => void;
  onEditTransaction: (transaction: BudgetTransaction) => void;
  onDeleteTransaction: (transaction: BudgetTransaction) => void;
};

function BudgetOverview({ summary, onAddExpense, onPlan, onEdit, onEditTransaction, onDeleteTransaction }: BudgetOverviewProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const { budget, spentCents, receivedCents, remainingCents, spentByCategory, transactions } = summary;
  const money = (cents: number) => formatMoney(cents, budget.currency);
  const total = budget.availableCents + receivedCents;
  const over = remainingCents < 0;
  const uncategorisedCents = spentByCategory.uncategorised ?? 0;

  const sectionTitle = {
    marginTop: spacing.md,
    color: colors.text,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
  } as const;

  const openActions = (transaction: BudgetTransaction) =>
    dialog.show({
      title: transaction.note || (transaction.direction === 'out' ? 'Expense' : 'Money in'),
      message: `${money(transaction.amountCents)} · ${formatDay(transaction.date)}`,
      buttons: [
        { label: 'Edit', onPress: () => onEditTransaction(transaction) },
        { label: 'Delete', style: 'destructive', onPress: () => onDeleteTransaction(transaction) },
        { label: 'Cancel', style: 'cancel' },
      ],
    });

  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: over ? colors.secondary : colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xxl }}>
          {over ? `${money(-remainingCents)} over` : `${money(remainingCents)} left`}
        </Text>
        <ProgressBar used={spentCents} total={total} height={10} />
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          {money(spentCents)} spent of {money(total)}
          {receivedCents ? ` · includes ${money(receivedCents)} received` : ''}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ActionButton label="Add expense" primary onPress={onAddExpense} />
        <ActionButton label="Plan with AI" onPress={onPlan} />
        <ActionButton label="Edit" onPress={onEdit} />
      </View>

      <Text accessibilityRole="header" style={sectionTitle}>
        Categories
      </Text>
      {budget.categories.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          No categories yet. Tap Edit or Plan with AI to add some.
        </Text>
      ) : (
        budget.categories.map((category) => {
          const spent = spentByCategory[category.id] ?? 0;
          const categoryOver = spent > category.limitCents;
          return (
            <View key={category.id} style={{ gap: spacing.xs + 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ flexShrink: 1, color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
                  {category.name}
                </Text>
                <Text style={{ color: categoryOver ? colors.secondary : colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
                  {money(spent)} / {money(category.limitCents)}
                </Text>
              </View>
              <ProgressBar used={spent} total={category.limitCents} height={6} />
            </View>
          );
        })
      )}
      {uncategorisedCents ? (
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          {money(uncategorisedCents)} spent without a category
        </Text>
      ) : null}

      <Text accessibilityRole="header" style={sectionTitle}>
        Activity
      </Text>
      {transactions.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          Nothing recorded for {summary.period.label} yet.
        </Text>
      ) : (
        <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
          {transactions.map((transaction, index) => {
            const category = budget.categories.find((item) => item.id === transaction.categoryId);
            const incoming = transaction.direction === 'in';
            return (
              <Pressable
                key={transaction.id}
                accessibilityRole="button"
                accessibilityHint="Opens edit and delete options"
                onPress={() => onEditTransaction(transaction)}
                onLongPress={() => openActions(transaction)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm + 4,
                  borderTopWidth: index === 0 ? 0 : 0.5,
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
                      {transaction.note || (incoming ? 'Money in' : (category?.name ?? 'Uncategorised'))}
                    </Text>
                    {transaction.detected ? (
                      <Text
                        style={{
                          overflow: 'hidden',
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 5,
                          backgroundColor: colors.primaryMuted,
                          color: colors.primary,
                          fontFamily: typography.fontFamily.medium,
                          fontSize: 10,
                        }}>
                        Detected
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                    {[incoming ? 'Money in' : (category?.name ?? 'Uncategorised'), formatDay(transaction.date)].join(' · ')}
                  </Text>
                </View>
                <Text style={{ color: incoming ? colors.primary : colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                  {incoming ? '+' : '−'}
                  {money(transaction.amountCents)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}

function ActionButton({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: primary ? 1.3 : 1,
        alignItems: 'center',
        paddingVertical: spacing.sm + 4,
        borderRadius: 999,
        backgroundColor: primary ? colors.primary : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text
        numberOfLines={1}
        style={{ color: primary ? colors.onPrimary : colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
        {label}
      </Text>
    </Pressable>
  );
}
