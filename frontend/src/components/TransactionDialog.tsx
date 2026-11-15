import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { CATEGORIES, errorMessage, request } from '../api';
import type { Category, Transaction } from '../types';
import { Button, Feedback, Field, Modal, today } from './ui';
const schema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição.').max(150),
  amount: z
    .string()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Informe um valor como 89,90.')
    .refine((v) => {
      const n = Number(v.replace(',', '.'));
      return n > 0 && n <= 1_000_000;
    }, 'Informe um valor entre R$ 0,01 e R$ 1.000.000,00.'),
  date: z.string().min(1, 'Selecione uma data.'),
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  type: z.enum(['EXPENSE', 'INCOME']),
});
type Values = z.infer<typeof schema>;
export function TransactionDialog({
  transaction,
  onClose,
  onCreateCategory,
}: {
  transaction?: Transaction;
  onClose: () => void;
  onCreateCategory: () => void;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => request<{ categories: Category[] }>(CATEGORIES),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: transaction
      ? {
          description: transaction.description,
          amount: (transaction.amount / 100).toFixed(2).replace('.', ','),
          date: transaction.date,
          categoryId: transaction.category.id,
          type: transaction.type,
        }
      : { description: '', amount: '', date: today(), categoryId: '', type: 'EXPENSE' },
  });
  const save = useMutation({
    mutationFn: (values: Values) =>
      request(
        `mutation SaveTransaction($input:TransactionInput!${transaction ? ',$id:ID!' : ''}){${transaction ? 'updateTransaction(id:$id,input:$input)' : 'createTransaction(input:$input)'}{id}}`,
        {
          input: { ...values, amount: Math.round(Number(values.amount.replace(',', '.')) * 100) },
          ...(transaction ? { id: transaction.id } : {}),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['transactions'] }),
        cache.invalidateQueries({ queryKey: ['summary'] }),
        cache.invalidateQueries({ queryKey: ['categories'] }),
      ]);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const errors = form.formState.errors;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title={transaction ? 'Editar transação' : 'Nova transação'}
      description="Registre sua despesa ou receita"
    >
      <form
        className="form-stack"
        noValidate
        onSubmit={form.handleSubmit((v) => {
          setError('');
          save.mutate(v);
        })}
      >
        <fieldset className="type-toggle">
          <legend className="sr-only">Tipo de transação</legend>
          {(['EXPENSE', 'INCOME'] as const).map((type) => (
            <label
              key={type}
              className={
                form.watch('type') === type
                  ? `active ${type === 'INCOME' ? 'income' : 'expense'}`
                  : ''
              }
            >
              <input type="radio" value={type} {...form.register('type')} />
              {type === 'INCOME' ? <ArrowUpCircle size={17} /> : <ArrowDownCircle size={17} />}{' '}
              {type === 'INCOME' ? 'Receita' : 'Despesa'}
            </label>
          ))}
        </fieldset>
        <Field id="transaction-description" label="Descrição" error={errors.description?.message}>
          <input
            id="transaction-description"
            placeholder="Ex. Almoço no restaurante"
            {...form.register('description')}
            maxLength={150}
            aria-invalid={!!errors.description}
            aria-describedby="transaction-description-error"
            autoFocus
          />
        </Field>
        <div className="form-row">
          <Field id="transaction-date" label="Data" error={errors.date?.message}>
            <input
              id="transaction-date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              {...form.register('date')}
              aria-invalid={!!errors.date}
            />
          </Field>
          <Field id="transaction-amount" label="Valor" error={errors.amount?.message}>
            <div className="input-with-prefix">
              <span>R$</span>
              <input
                id="transaction-amount"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register('amount')}
                aria-invalid={!!errors.amount}
                aria-describedby="transaction-amount-error"
              />
            </div>
          </Field>
        </div>
        <Field id="transaction-category" label="Categoria" error={errors.categoryId?.message}>
          <select
            id="transaction-category"
            {...form.register('categoryId')}
            aria-invalid={!!errors.categoryId}
          >
            <option value="">Selecione</option>
            {categories.data?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {categories.isPending && (
          <p className="hint" role="status">
            Carregando categorias…
          </p>
        )}
        {categories.isError && <Feedback message={errorMessage(categories.error)} error />}
        {categories.data?.categories.length === 0 && (
          <div className="inline-note">
            <p>Crie uma categoria para registrar sua primeira transação.</p>
            <Button variant="secondary" onClick={onCreateCategory} type="button">
              Criar categoria
            </Button>
          </div>
        )}
        {error && <Feedback message={error} error />}
        <Button
          type="submit"
          className="w-full"
          loading={save.isPending}
          disabled={!categories.data?.categories.length}
        >
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
