import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { budgetErrorMessage, saveIncome } from '../../budget/budgetRepo';
import { useBudgets } from '../../budget/BudgetsProvider';
import { centsToInput, defaultCurrency, parseMoney } from '../../budget/money';
import type { IncomeKind } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { dialog } from '../dialog/dialogStore';
import { Sheet } from '../Sheet';
import { toast } from '../toast/toastStore';
import { ChoiceChips, FieldLabel, MoneyField } from './fields';

export function IncomeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const { uid, income } = useBudgets();
  const [kind, setKind] = useState<IncomeKind>('monthly');
  const [amount, setAmount] = useState('');
  const currency = income?.currency ?? defaultCurrency();

  useEffect(() => {
    if (!visible) return;
    setKind(income?.kind ?? 'monthly');
    setAmount(income ? centsToInput(income.amountCents) : '');
    // Only reset when the sheet opens, not while the person is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    const amountCents = parseMoney(amount);
    if (!amountCents || amountCents <= 0) {
      toast.error(kind === 'monthly' ? 'Enter how much you earn each month.' : 'Enter how much money you have.');
      return;
    }
    if (!uid) return;
    Keyboard.dismiss();
    onClose();
    saveIncome(uid, { kind, amountCents, currency }).then(
      () => toast.success(income ? 'Income updated' : 'Income saved'),
      (error) => toast.error(budgetErrorMessage(error, "Couldn't save your income. Please try again.")),
    );
  };

  const remove = async () => {
    if (!uid) return;
    const confirmed = await dialog.confirm({
      title: 'Remove your income?',
      message: "Your budgets stay as they are. You just won't see how much is left to budget.",
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    onClose();
    saveIncome(uid, null).then(
      () => toast.success('Income removed'),
      (error) => toast.error(budgetErrorMessage(error, "Couldn't remove your income. Please try again.")),
    );
  };

  return (
    <Sheet visible={visible} title={income ? 'Edit income' : 'Your income'} onClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.sm,
              lineHeight: 20,
            }}>
            Every budget you create is taken from this amount, so you can see how much is still free.
          </Text>

          <View style={{ gap: spacing.sm }}>
            <FieldLabel>Type</FieldLabel>
            <ChoiceChips
              options={[
                { value: 'monthly', label: 'Monthly salary' },
                { value: 'total', label: 'Money I have' },
              ]}
              value={kind}
              onChange={setKind}
            />
          </View>

          <MoneyField
            label={kind === 'monthly' ? 'How much you earn each month' : 'How much money you have'}
            currency={currency}
            value={amount}
            onChangeText={setAmount}
            large
            autoFocus={!income}
            returnKeyType="done"
            onSubmitEditing={save}
          />

          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: spacing.sm + 6,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              Save
            </Text>
          </Pressable>

          {income ? (
            <Text
              accessibilityRole="button"
              onPress={remove}
              suppressHighlighting
              style={{ textAlign: 'center', color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              Remove income
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
