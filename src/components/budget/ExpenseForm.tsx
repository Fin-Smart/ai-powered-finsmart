import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';

import { centsToInput, parseMoney } from '../../budget/money';
import { startOfDay } from '../../budget/period';
import type { Budget, BudgetTransaction, TransactionDirection, TransactionDraft } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { toast } from '../toast/toastStore';
import { DateField } from './DateField';
import { ChoiceChips, FieldLabel, MoneyField, TextField } from './fields';

const UNCATEGORISED = 'uncategorised';

type ExpenseFormProps = {
  budget: Budget;
  initial?: BudgetTransaction;
  onSubmit: (draft: TransactionDraft) => Promise<void>;
  onDelete?: () => void;
};

export function ExpenseForm({ budget, initial, onSubmit, onDelete }: ExpenseFormProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const [direction, setDirection] = useState<TransactionDirection>(initial?.direction ?? 'out');
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? budget.categories[0]?.id ?? UNCATEGORISED);
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial ? startOfDay(initial.date) : startOfDay(Date.now()));
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const amountCents = parseMoney(amount);
    if (!amountCents) {
      toast.error('Enter an amount.');
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const isToday = date === startOfDay(Date.now());
      await onSubmit({
        amountCents,
        direction,
        categoryId: direction === 'out' && categoryId !== UNCATEGORISED ? categoryId : null,
        note: note.trim(),
        // Today's entries keep the current time so they sort above earlier ones.
        date: initial && startOfDay(initial.date) === date ? initial.date : isToday ? Date.now() : date + 12 * 60 * 60 * 1000,
        source: initial?.source ?? 'manual',
        sourceId: initial?.sourceId ?? null,
        detected: initial?.detected ?? false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <ChoiceChips
        options={[
          { value: 'out', label: 'Money out' },
          { value: 'in', label: 'Money in' },
        ]}
        value={direction}
        onChange={setDirection}
      />

      <MoneyField large currency={budget.currency} value={amount} onChangeText={setAmount} autoFocus={!initial} accessibilityLabel="Amount" />

      {direction === 'out' ? (
        <View style={{ gap: spacing.sm }}>
          <FieldLabel>Category</FieldLabel>
          <ChoiceChips
            options={[
              ...budget.categories.map((category) => ({ value: category.id, label: category.name })),
              { value: UNCATEGORISED, label: 'Uncategorised' },
            ]}
            value={categoryId}
            onChange={setCategoryId}
          />
        </View>
      ) : null}

      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder={direction === 'out' ? 'e.g. Checkers groceries' : 'e.g. Salary'}
        autoCapitalize="sentences"
      />

      <DateField label="Date" value={date} onChange={setDate} />

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
          {isSaving ? 'Saving…' : initial ? 'Save changes' : direction === 'out' ? 'Add expense' : 'Add money in'}
        </Text>
      </Pressable>

      {onDelete ? (
        <Text
          accessibilityRole="button"
          onPress={onDelete}
          suppressHighlighting
          style={{ textAlign: 'center', color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
          Delete
        </Text>
      ) : null}
    </View>
  );
}
