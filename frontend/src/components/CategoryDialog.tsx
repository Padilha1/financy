import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { CATEGORY_FIELDS, errorMessage, request } from '../api';
import type { Category } from '../types';
import { Button, colors, Feedback, Field, icons, Modal } from './ui';
const schema = z.object({
  name: z.string().trim().min(1, 'Informe o título.').max(50, 'Use até 50 caracteres.'),
  description: z.string().trim().max(200, 'Use até 200 caracteres.'),
  color: z.string().min(1),
  icon: z.string().min(1),
});
type Values = z.infer<typeof schema>;
export function CategoryDialog({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
        }
      : { name: '', description: '', color: 'green', icon: 'briefcase' },
  });
  const save = useMutation({
    mutationFn: (input: Values) =>
      request(
        `mutation SaveCategory($input:CategoryInput!${category ? ',$id:ID!' : ''}){${category ? 'updateCategory(id:$id,input:$input)' : 'createCategory(input:$input)'}{${CATEGORY_FIELDS}}}`,
        { input, ...(category ? { id: category.id } : {}) },
      ),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['categories'] });
      await cache.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const selected = form.watch();
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      description="Organize suas transações com categorias"
    >
      <form
        onSubmit={form.handleSubmit((v) => {
          setError('');
          save.mutate(v);
        })}
        noValidate
        className="form-stack"
      >
        <Field id="category-name" label="Título" error={form.formState.errors.name?.message}>
          <input
            id="category-name"
            placeholder="Ex. Alimentação"
            maxLength={50}
            {...form.register('name')}
            aria-invalid={!!form.formState.errors.name}
            aria-describedby="category-name-error"
            autoFocus
          />
        </Field>
        <Field
          id="category-description"
          label="Descrição"
          hint="Opcional"
          error={form.formState.errors.description?.message}
        >
          <input
            id="category-description"
            placeholder="Descrição da categoria"
            {...form.register('description')}
            maxLength={200}
          />
        </Field>
        <fieldset>
          <legend>Ícone</legend>
          <div className="icon-picker">
            {Object.entries(icons).map(([key, { component: Icon, label }]) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={selected.icon === key}
                className={selected.icon === key ? 'chosen' : ''}
                onClick={() => form.setValue('icon', key, { shouldDirty: true })}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Cor</legend>
          <div className="color-picker">
            {Object.entries(colors).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`swatch tone-${key} ${selected.color === key ? 'chosen' : ''}`}
                aria-label={label}
                aria-pressed={selected.color === key}
                onClick={() => form.setValue('color', key, { shouldDirty: true })}
              >
                {selected.color === key && <Check size={19} />}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <Feedback message={error} error />}
        <Button type="submit" loading={save.isPending} className="w-full">
          Salvar
        </Button>
      </form>
    </Modal>
  );
}
