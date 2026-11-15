import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorMessage, request } from '../api';
import { Button, Feedback, Modal } from './ui';
export function DeleteDialog({
  kind,
  id,
  name,
  onClose,
}: {
  kind: 'category' | 'transaction';
  id: string;
  name: string;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const cache = useQueryClient();
  const remove = useMutation({
    mutationFn: () =>
      request(
        `mutation Delete($id:ID!){${kind === 'category' ? 'deleteCategory' : 'deleteTransaction'}(id:$id)}`,
        { id },
      ),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['categories'] }),
        cache.invalidateQueries({ queryKey: ['transactions'] }),
        cache.invalidateQueries({ queryKey: ['summary'] }),
      ]);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !remove.isPending) onClose();
      }}
      title={`Excluir ${kind === 'category' ? 'categoria' : 'transação'}?`}
      description={`“${name}” será removida. Essa ação não pode ser desfeita.`}
    >
      <div className="form-stack">
        {kind === 'category' && (
          <p className="hint">
            Categorias com transações precisam ser desvinculadas antes de serem excluídas.
          </p>
        )}
        {error && <Feedback message={error} error />}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
