import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { CATEGORIES, errorMessage, request, TRANSACTIONS } from '../api';
import type { Category, Filter, Transaction, TransactionPage } from '../types';
import { Button, EmptyState, ErrorState, Field, IconButton } from '../components/ui';
import { TransactionList } from '../components/TransactionList';
import { TransactionDialog } from '../components/TransactionDialog';
import { CategoryDialog } from '../components/CategoryDialog';
import { DeleteDialog } from '../components/DeleteDialog';
export function Transactions() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('');
  const [categoryId, setCategory] = useState(searchParams.get('categoria') ?? '');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [dialog, setDialog] = useState<'transaction' | 'category' | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const filter: Filter = {
    ...(searchTerm ? { search: searchTerm } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(month ? { month } : {}),
  };
  const data = useQuery({
    queryKey: ['transactions', filter, page],
    queryFn: () =>
      request<{ transactions: TransactionPage }>(TRANSACTIONS, { filter, page, pageSize: 10 }),
    placeholderData: keepPreviousData,
  });
  const cats = useQuery({
    queryKey: ['categories'],
    queryFn: () => request<{ categories: Category[] }>(CATEGORIES),
  });
  const total = data.data?.transactions.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 10));
  useEffect(() => {
    if (!data.isPlaceholderData && page > pages) setPage(pages);
  }, [pages, page, data.isPlaceholderData]);
  const filtered = !!(search || type || categoryId || month);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Transações</h1>
          <p>Gerencie todas as suas transações financeiras</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialog('transaction');
          }}
        >
          <Plus size={18} />
          Nova transação
        </Button>
      </div>
      <section className="panel filters" aria-label="Filtros de transações">
        <Field id="search" label="Buscar">
          <div className="input-icon">
            <Search size={18} />
            <input
              id="search"
              placeholder="Buscar por descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={150}
            />
          </div>
        </Field>
        <Field id="filter-type" label="Tipo">
          <select
            id="filter-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="INCOME">Entrada</option>
            <option value="EXPENSE">Saída</option>
          </select>
        </Field>
        <Field id="filter-category" label="Categoria">
          <select
            id="filter-category"
            value={categoryId}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {cats.data?.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="filter-month" label="Período">
          <input
            id="filter-month"
            aria-label="Período"
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        {filtered && (
          <IconButton
            label="Limpar filtros"
            onClick={() => {
              setSearch('');
              setSearchTerm('');
              setCategory('');
              setType('');
              setMonth('');
              setPage(1);
            }}
          >
            <X size={18} />
          </IconButton>
        )}
      </section>
      {cats.isError && (
        <ErrorState message={errorMessage(cats.error)} onRetry={() => void cats.refetch()} />
      )}
      <section
        className="panel all-transactions"
        aria-label="Lista de transações"
        aria-busy={data.isFetching}
      >
        {data.isPending ? (
          <div className="loading-page" role="status">
            Carregando transações…
          </div>
        ) : data.isError ? (
          <ErrorState message={errorMessage(data.error)} onRetry={() => void data.refetch()} />
        ) : total ? (
          <>
            <TransactionList
              items={data.data!.transactions.items}
              onEdit={(t) => {
                setEditing(t);
                setDialog('transaction');
              }}
              onDelete={setDeleting}
            />
            <div className="pagination">
              <p aria-live="polite">
                {(page - 1) * 10 + 1} a {Math.min(page * 10, total)}{' '}
                <span>| {total} resultados</span>
              </p>
              <div>
                <IconButton
                  label="Página anterior"
                  disabled={page === 1 || data.isPlaceholderData}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={18} />
                </IconButton>
                <span className="page-number">
                  {page} de {pages}
                </span>
                <IconButton
                  label="Próxima página"
                  disabled={page >= pages || data.isPlaceholderData}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title={filtered ? 'Nenhuma transação encontrada' : 'Nenhuma transação por aqui'}
            description={
              filtered
                ? 'Ajuste os filtros para encontrar outras transações.'
                : 'Adicione sua primeira receita ou despesa.'
            }
            action={
              !filtered ? (
                <Button onClick={() => setDialog('transaction')}>
                  <Plus size={17} />
                  Nova transação
                </Button>
              ) : undefined
            }
          />
        )}
      </section>
      {dialog === 'transaction' && (
        <TransactionDialog
          transaction={editing}
          onClose={() => setDialog(null)}
          onCreateCategory={() => setDialog('category')}
        />
      )}
      {dialog === 'category' && <CategoryDialog onClose={() => setDialog(null)} />}
      {deleting && (
        <DeleteDialog
          kind="transaction"
          id={deleting.id}
          name={deleting.description}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
