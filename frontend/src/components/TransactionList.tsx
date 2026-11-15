import { Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { Badge, CategoryIcon, displayDate, IconButton, money, TypeLabel } from './ui';
export function TransactionList({
  items,
  compact = false,
  onEdit,
  onDelete,
}: {
  items: Transaction[];
  compact?: boolean;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}) {
  return (
    <div
      className={`transaction-list ${compact ? 'compact' : ''}`}
      role={compact ? 'list' : undefined}
    >
      {!compact && (
        <div className="transaction-head" aria-hidden="true">
          <span>Descrição</span>
          <span>Data</span>
          <span>Categoria</span>
          <span>Tipo</span>
          <span>Valor</span>
          <span>Ações</span>
        </div>
      )}
      {items.map((t) => (
        <article className="transaction-row" key={t.id} aria-label={t.description}>
          <div className="transaction-name">
            <CategoryIcon category={t.category} />
            <div>
              <p>{t.description}</p>
              {compact && <span className="hint">{displayDate(t.date)}</span>}
            </div>
          </div>
          {!compact && (
            <time className="transaction-date" dateTime={t.date}>
              {displayDate(t.date)}
            </time>
          )}
          <div className="transaction-category">
            <Badge category={t.category} />
          </div>
          {!compact && (
            <div className="transaction-type">
              <TypeLabel type={t.type} />
            </div>
          )}
          <div className="transaction-value">
            <span>
              {t.type === 'INCOME' ? '+' : '−'} {money(t.amount)}
            </span>
            {compact && <TypeLabel type={t.type} />}
          </div>
          {!compact && (
            <div className="transaction-actions">
              <IconButton
                className="danger-icon"
                label={`Excluir ${t.description}`}
                onClick={() => onDelete?.(t)}
              >
                <Trash2 size={17} />
              </IconButton>
              <IconButton label={`Editar ${t.description}`} onClick={() => onEdit?.(t)}>
                <Pencil size={17} />
              </IconButton>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
