import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { adjustPlan, planBudget, type BudgetPlan, type DraftCategory } from '../../budget/budgetPlanner';
import { centsToInput, formatMoney, parseMoney } from '../../budget/money';
import type { BudgetKind } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from '../coach/CoachAvatar';
import { PaperPlaneIcon, TickIcon } from '../icons';
import { Bullet } from '../shield/ScamVerdict';
import { errorMessage, toast } from '../toast/toastStore';
import { FieldLabel, MoneyField, TextField, useInputStyle } from './fields';

type PlannerPanelProps = {
  kind: BudgetKind;
  label: string;
  name: string;
  currency: string;
  availableCents: number;
  current: { name: string; limitCents: number; spentCents: number }[];
  onApply: (plan: BudgetPlan) => void;
};

type PlanRow = { id: string; name: string; limit: string; reason: string; included: boolean };

const rowId = () => Math.random().toString(36).slice(2, 10);

/**
 * Asks Smart Coach to split the available money into categories. The user, or Smart Coach on request,
 * can then tick, untick, edit, add or remove them before applying.
 */
export function PlannerPanel({ onApply, ...request }: PlannerPanelProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const inputStyle = useInputStyle();
  const [goals, setGoals] = useState('');
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [change, setChange] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const createPlan = async () => {
    if (request.availableCents <= 0) {
      toast.error('Enter how much money is available first.');
      return;
    }
    Keyboard.dismiss();
    setIsPlanning(true);
    try {
      const plan = await planBudget({ ...request, goals });
      setRows(
        plan.categories.map((item) => ({
          id: rowId(),
          name: item.name,
          limit: centsToInput(item.limitCents),
          reason: item.reason,
          included: true,
        })),
      );
      setTips(plan.tips);
    } catch (error) {
      toast.error(errorMessage(error), { action: { label: 'Retry', onPress: () => void createPlan() } });
    } finally {
      setIsPlanning(false);
    }
  };

  const updateRow = (id: string, patch: Partial<PlanRow>) =>
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? null);

  const addRow = () =>
    setRows((current) => [...(current ?? []), { id: rowId(), name: '', limit: '', reason: '', included: true }]);

  const removeRow = (id: string) => setRows((current) => current?.filter((row) => row.id !== id) ?? null);

  const hasBadAmount = (list: PlanRow[]) => list.some((row) => row.limit.trim() && parseMoney(row.limit) === null);

  const askCoach = async () => {
    const instruction = change.trim();
    if (!rows || !instruction) return;
    if (hasBadAmount(rows)) {
      toast.error('Check the category amounts.');
      return;
    }
    Keyboard.dismiss();
    setIsAdjusting(true);
    try {
      const draft: DraftCategory[] = rows
        .filter((row) => row.name.trim())
        .map((row) => ({ name: row.name.trim(), limitCents: parseMoney(row.limit) ?? 0, reason: row.reason, included: row.included }));
      const result = await adjustPlan({ ...request, goals, draft, instruction });

      // Reuse row ids for unchanged names so their inputs aren't re-created mid-edit.
      const used = new Set<string>();
      const idFor = (name: string) => {
        const match = rows.find((row) => !used.has(row.id) && row.name.trim().toLowerCase() === name.toLowerCase());
        const id = match?.id ?? rowId();
        used.add(id);
        return id;
      };
      setRows(
        result.categories.map((item) => ({
          id: idFor(item.name),
          name: item.name,
          limit: centsToInput(item.limitCents),
          reason: item.reason,
          included: item.included,
        })),
      );
      if (result.tips.length) setTips(result.tips);
      setChange('');
      toast.success(result.summary || 'Plan updated');
    } catch (error) {
      toast.error(errorMessage(error), { action: { label: 'Retry', onPress: () => void askCoach() } });
    } finally {
      setIsAdjusting(false);
    }
  };

  const ticked = rows?.filter((row) => row.included && row.name.trim()) ?? [];
  const plannedCents = ticked.reduce((total, row) => total + (parseMoney(row.limit) ?? 0), 0);
  const leftCents = request.availableCents - plannedCents;

  const apply = () => {
    if (!ticked.length) {
      toast.error('Tick at least one category to use.');
      return;
    }
    if (hasBadAmount(ticked)) {
      toast.error('Check the category amounts.');
      return;
    }
    Keyboard.dismiss();
    onApply({
      categories: ticked.map((row) => ({ name: row.name.trim(), limitCents: parseMoney(row.limit) ?? 0, reason: row.reason })),
      tips,
    });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}>
        <CoachAvatar size={36} />
        <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, lineHeight: 20 }}>
          Smart Coach will split {formatMoney(request.availableCents, request.currency)} into categories you can edit.
        </Text>
      </View>

      <TextField
        label="What matters to you? (optional)"
        value={goals}
        onChangeText={setGoals}
        placeholder="e.g. pay off my credit card, save for a car"
        multiline
        textAlignVertical="top"
        style={{ minHeight: 84 }}
      />

      <Pressable
        accessibilityRole="button"
        disabled={isPlanning || isAdjusting}
        onPress={createPlan}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 6,
          borderRadius: 999,
          backgroundColor: colors.primary,
          opacity: pressed || isPlanning ? 0.8 : 1,
        })}>
        {isPlanning ? <ActivityIndicator size="small" color={colors.onPrimary} /> : null}
        <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {isPlanning ? 'Planning…' : rows ? 'Try again' : 'Create plan'}
        </Text>
      </Pressable>

      {rows ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
            Untick anything you don't want, change amounts, or add your own.
          </Text>

          {rows.map((row) => (
            <PlanRowView
              key={row.id}
              row={row}
              currency={request.currency}
              onChange={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}

          <Text
            accessibilityRole="button"
            onPress={addRow}
            suppressHighlighting
            style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm, paddingVertical: spacing.xs }}>
            + Add category
          </Text>

          <Text
            style={{
              color: leftCents < 0 ? colors.secondary : colors.textMuted,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.xs,
            }}>
            {formatMoney(plannedCents, request.currency)} of {formatMoney(request.availableCents, request.currency)} planned ·{' '}
            {leftCents < 0
              ? `${formatMoney(-leftCents, request.currency)} over`
              : `${formatMoney(leftCents, request.currency)} left`}
          </Text>

          <View style={{ gap: spacing.xs }}>
            <FieldLabel>Ask Smart Coach to change something</FieldLabel>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <TextInput
                value={change}
                onChangeText={setChange}
                editable={!isAdjusting}
                placeholder={leftCents < 0 ? 'e.g. make it fit my budget' : 'e.g. untick Fun, add Gym for 400'}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Ask Smart Coach to change the plan"
                multiline
                style={[inputStyle, { flex: 1, maxHeight: 110, fontSize: typography.fontSize.sm }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send to Smart Coach"
                accessibilityState={{ busy: isAdjusting, disabled: isAdjusting || !change.trim() }}
                disabled={isAdjusting || !change.trim()}
                onPress={askCoach}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  opacity: !change.trim() && !isAdjusting ? 0.4 : pressed ? 0.8 : 1,
                })}>
                {isAdjusting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <PaperPlaneIcon size={20} color={colors.onPrimary} strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          {tips.map((tip) => (
            <Bullet key={tip} text={tip} />
          ))}

          <Pressable
            accessibilityRole="button"
            disabled={isAdjusting}
            onPress={apply}
            style={({ pressed }) => ({
              alignItems: 'center',
              marginTop: spacing.xs,
              paddingVertical: spacing.sm + 4,
              borderRadius: 999,
              backgroundColor: colors.text,
              opacity: pressed || isAdjusting ? 0.6 : 1,
            })}>
            <Text style={{ color: colors.background, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              {ticked.length === rows.length ? 'Use this plan' : `Use ${ticked.length} of ${rows.length} categories`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type PlanRowViewProps = {
  row: PlanRow;
  currency: string;
  onChange: (patch: Partial<PlanRow>) => void;
  onRemove: () => void;
};

function PlanRowView({ row, currency, onChange, onRemove }: PlanRowViewProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const inputStyle = useInputStyle();
  const label = row.name.trim() || 'New category';

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: row.included }}
          accessibilityLabel={`Include ${label}`}
          onPress={() => onChange({ included: !row.included })}
          hitSlop={8}
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: row.included ? 0 : 1.5,
            borderColor: colors.textMuted,
            backgroundColor: row.included ? colors.primary : 'transparent',
          }}>
          {row.included ? <TickIcon size={16} color={colors.onPrimary} strokeWidth={2.6} /> : null}
        </Pressable>

        <View style={{ flex: 1.4, opacity: row.included ? 1 : 0.45 }}>
          <TextInput
            value={row.name}
            onChangeText={(name) => onChange({ name })}
            placeholder="Category"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Category name"
            style={[inputStyle, { fontSize: typography.fontSize.sm }]}
          />
        </View>
        <View style={{ flex: 1, opacity: row.included ? 1 : 0.45 }}>
          <MoneyField
            currency={currency}
            value={row.limit}
            onChangeText={(limit) => onChange({ limit })}
            accessibilityLabel={`${label} amount`}
            style={{ fontSize: typography.fontSize.sm }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          hitSlop={8}
          style={{ paddingHorizontal: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: typography.fontSize.lg }}>×</Text>
        </Pressable>
      </View>

      {row.reason ? (
        <Text
          style={{
            marginLeft: 24 + spacing.sm,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.xs,
            lineHeight: 17,
            opacity: row.included ? 1 : 0.45,
          }}>
          {row.reason}
        </Text>
      ) : null}
    </View>
  );
}
