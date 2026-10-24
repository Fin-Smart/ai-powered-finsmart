import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import type { BudgetPlan } from '../../budget/budgetPlanner';
import { useBudgets } from '../../budget/BudgetsProvider';
import { allocateIncome } from '../../budget/income';
import { centsToInput, defaultCurrency, formatMoney, parseMoney } from '../../budget/money';
import { startOfDay } from '../../budget/period';
import type { Budget, BudgetDraft, BudgetKind } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { toast } from '../toast/toastStore';
import { DateField } from './DateField';
import { ChoiceChips, FieldLabel, MoneyField, TextField, useInputStyle } from './fields';
import { PlannerPanel } from './PlannerPanel';

const LABELS = ['Household', 'Personal', 'Savings', 'Holiday', 'Business', 'Event'];
const MONTHLY_CATEGORIES = ['Housing', 'Groceries', 'Transport', 'Utilities', 'Airtime & data', 'Savings', 'Fun'];
const ONE_OFF_CATEGORIES = ['Travel', 'Accommodation', 'Food', 'Activities'];
const DAY = 24 * 60 * 60 * 1000;

type CategoryRow = { id: string; name: string; limit: string };

export const newCategoryId = () => `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const rowsFrom = (names: string[]): CategoryRow[] => names.map((name) => ({ id: newCategoryId(), name, limit: '' }));

type BudgetFormProps = {
  initial?: Budget;
  onSubmit: (draft: BudgetDraft) => Promise<void>;
  onDelete?: () => void;
};

export function BudgetForm({ initial, onSubmit, onDelete }: BudgetFormProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const inputStyle = useInputStyle();
  const { income, summaries } = useBudgets();
  const currency = initial?.currency ?? income?.currency ?? defaultCurrency();
  const today = startOfDay(Date.now());

  const [name, setName] = useState(initial?.name ?? '');
  const [label, setLabel] = useState(initial ? (LABELS.includes(initial.label) ? initial.label : 'Other') : 'Household');
  const [customLabel, setCustomLabel] = useState(initial && !LABELS.includes(initial.label) ? initial.label : '');
  const [kind, setKind] = useState<BudgetKind>(initial?.kind ?? 'monthly');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [endDate, setEndDate] = useState(initial?.endDate ?? today + 7 * DAY);
  const [available, setAvailable] = useState(initial ? centsToInput(initial.availableCents) : '');
  const [categories, setCategories] = useState<CategoryRow[]>(
    initial
      ? initial.categories.map((category) => ({ id: category.id, name: category.name, limit: centsToInput(category.limitCents) }))
      : rowsFrom(MONTHLY_CATEGORIES),
  );
  const [showPlanner, setShowPlanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const usingCustomLabel = label === 'Other';
  const availableCents = parseMoney(available) ?? 0;
  const allocatedCents = categories.reduce((total, row) => total + (parseMoney(row.limit) ?? 0), 0);
  const unallocatedCents = availableCents - allocatedCents;
  const incomeFreeCents =
    income && income.currency === currency
      ? allocateIncome(
          income,
          summaries.map((summary) => summary.budget),
          initial?.id,
        ).freeCents
      : null;

  const changeKind = (next: BudgetKind) => {
    setKind(next);
    // Swap in sensible starter categories while nothing has been typed yet.
    if (!initial && categories.every((row) => !row.limit)) {
      setCategories(rowsFrom(next === 'monthly' ? MONTHLY_CATEGORIES : ONE_OFF_CATEGORIES));
    }
  };

  const updateRow = (id: string, patch: Partial<CategoryRow>) =>
    setCategories((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const applyPlan = (plan: BudgetPlan) => {
    setCategories((rows) =>
      plan.categories.map((item) => ({
        id: rows.find((row) => row.name.trim().toLowerCase() === item.name.toLowerCase())?.id ?? newCategoryId(),
        name: item.name,
        limit: centsToInput(item.limitCents),
      })),
    );
    setShowPlanner(false);
    toast.success('Plan added. Edit anything before saving.');
  };

  const submit = async () => {
    const finalLabel = usingCustomLabel ? customLabel.trim() : label;
    const problem = !name.trim()
      ? 'Give your budget a name.'
      : !finalLabel
        ? 'Enter a label for this budget.'
        : availableCents <= 0
          ? 'Enter how much money is available.'
          : kind === 'oneoff' && endDate < startDate
            ? 'The end date must be after the start date.'
            : categories.some((row) => row.name.trim() && parseMoney(row.limit) === null && row.limit.trim())
              ? 'Check the category amounts.'
              : null;
    if (problem) {
      toast.error(problem);
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        label: finalLabel,
        kind,
        startDate: kind === 'oneoff' ? startDate : null,
        endDate: kind === 'oneoff' ? endDate : null,
        currency,
        availableCents,
        categories: categories
          .filter((row) => row.name.trim())
          .map((row) => ({ id: row.id, name: row.name.trim(), limitCents: parseMoney(row.limit) ?? 0 })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Monthly budget" autoCapitalize="sentences" />

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Label</FieldLabel>
        <ChoiceChips options={[...LABELS, 'Other'].map((value) => ({ value, label: value }))} value={label} onChange={setLabel} />
        {usingCustomLabel ? (
          <TextInput
            value={customLabel}
            onChangeText={setCustomLabel}
            placeholder="Your own label"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Custom label"
            style={inputStyle}
          />
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Type</FieldLabel>
        <ChoiceChips
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'oneoff', label: 'One-off' },
          ]}
          value={kind}
          onChange={changeKind}
        />
      </View>

      {kind === 'oneoff' ? (
        <View style={{ gap: spacing.md }}>
          <DateField
            label="Starts"
            value={startDate}
            onChange={(value) => {
              setStartDate(value);
              if (endDate < value) setEndDate(value);
            }}
          />
          <DateField label="Ends" value={endDate} onChange={setEndDate} minimum={startDate} />
        </View>
      ) : null}

      <View style={{ gap: spacing.xs + 2 }}>
        <MoneyField
          label={kind === 'monthly' ? 'Money available each month' : 'Total money available'}
          currency={currency}
          value={available}
          onChangeText={setAvailable}
        />
        {incomeFreeCents !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              style={{
                flex: 1,
                color: availableCents > incomeFreeCents ? colors.secondary : colors.textMuted,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.fontSize.xs,
              }}>
              {incomeFreeCents <= 0 && availableCents === 0
                ? 'All of your income is already in budgets'
                : availableCents > incomeFreeCents
                  ? `${formatMoney(availableCents - Math.max(incomeFreeCents, 0), currency)} more than you have free`
                  : `${formatMoney(incomeFreeCents - availableCents, currency)} of your income still free`}
            </Text>
            {incomeFreeCents > 0 && availableCents !== incomeFreeCents ? (
              <Text
                accessibilityRole="button"
                onPress={() => setAvailable(centsToInput(incomeFreeCents))}
                suppressHighlighting
                style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
                Use {formatMoney(incomeFreeCents, currency)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <FieldLabel>Categories</FieldLabel>
          </View>
          <Text
            accessibilityRole="button"
            onPress={() => setShowPlanner((current) => !current)}
            suppressHighlighting
            style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
            {showPlanner ? 'Hide planner' : 'Plan with Smart Coach'}
          </Text>
        </View>

        {showPlanner ? (
          <PlannerPanel
            kind={kind}
            label={usingCustomLabel ? customLabel.trim() || 'Personal' : label}
            name={name || 'My budget'}
            currency={currency}
            availableCents={availableCents}
            current={[]}
            onApply={applyPlan}
          />
        ) : null}

        {categories.map((row) => (
          <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={row.name}
              onChangeText={(value) => updateRow(row.id, { name: value })}
              placeholder="Category"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Category name"
              style={[inputStyle, { flex: 1.4 }]}
            />
            <View style={{ flex: 1 }}>
              <MoneyField
                currency={currency}
                value={row.limit}
                onChangeText={(value) => updateRow(row.id, { limit: value })}
                accessibilityLabel={`${row.name || 'Category'} limit`}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.name || 'category'}`}
              onPress={() => setCategories((rows) => rows.filter((item) => item.id !== row.id))}
              hitSlop={8}
              style={{ paddingHorizontal: spacing.xs }}>
              <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.lg }}>×</Text>
            </Pressable>
          </View>
        ))}

        <Text
          accessibilityRole="button"
          onPress={() => setCategories((rows) => [...rows, { id: newCategoryId(), name: '', limit: '' }])}
          suppressHighlighting
          style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm, paddingVertical: spacing.xs }}>
          + Add category
        </Text>

        {availableCents > 0 ? (
          <Text
            style={{
              color: unallocatedCents < 0 ? colors.secondary : colors.textMuted,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.xs,
            }}>
            {formatMoney(allocatedCents, currency)} allocated ·{' '}
            {unallocatedCents < 0
              ? `${formatMoney(-unallocatedCents, currency)} over`
              : `${formatMoney(unallocatedCents, currency)} unallocated`}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={submit}
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: spacing.sm + 6,
          borderRadius: 999,
          backgroundColor: colors.primary,
          opacity: pressed || isSaving ? 0.8 : 1,
        })}>
        <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {isSaving ? 'Saving…' : initial ? 'Save changes' : 'Create budget'}
        </Text>
      </Pressable>

      {onDelete ? (
        <Text
          accessibilityRole="button"
          onPress={onDelete}
          suppressHighlighting
          style={{ textAlign: 'center', color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
          Delete budget
        </Text>
      ) : null}
    </View>
  );
}
