import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Plus, Wallet } from 'lucide-react';
import { CATEGORIES, errorMessage, request, SUMMARY, TRANSACTIONS } from '../api';
import type { Category, Summary, TransactionPage } from '../types';
import { Badge, Button, currentMonth, EmptyState, ErrorState, money } from '../components/ui';
import { TransactionList } from '../components/TransactionList';
import { TransactionDialog } from '../components/TransactionDialog';
import { CategoryDialog } from '../components/CategoryDialog';
export function Dashboard() {
  const [dialog, setDialog] = useState<'transaction' | 'category' | null>(null);
  const month = currentMonth();
  const summary = useQuery({
    queryKey: ['summary', month],
    queryFn: () => request<{ summary: Summary }>(SUMMARY, { month }),
  });
  const transactions = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () =>
      request<{ transactions: TransactionPage }>(TRANSACTIONS, { page: 1, pageSize: 5 }),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => request<{ categories: Category[] }>(CATEGORIES),
  });
  const error = summary.error || transactions.error || categories.error;
  if (error)
    return (
      <ErrorState
        message={errorMessage(error)}
        onRetry={() => {
          void summary.refetch();
          void transactions.refetch();
          void categories.refetch();
        }}
      />
    );
  if (summary.isPending || transactions.isPending || categories.isPending)
    return (
      <div className="loading-page" role="status">
        Carregando suas finanças…
      </div>
    );
  const s = summary.data!.summary;
  const cats = [...categories.data!.categories]
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 5);
  return (
    <div className="dashboard-page">
      <h1 className="sr-only">Dashboard</h1>
      <div className="summary-grid">
        <section className="summary-card">
          <div>
            <Wallet className="purple-text" size={20} />
            <h2>Saldo total</h2>
          </div>
          <strong>{money(s.balance)}</strong>
        </section>
        <section className="summary-card">
          <div>
            <ArrowUpCircle className="income" size={20} />
            <h2>Receitas do mês</h2>
          </div>
          <strong>{money(s.income)}</strong>
        </section>
        <section className="summary-card">
          <div>
            <ArrowDownCircle className="expense" size={20} />
            <h2>Despesas do mês</h2>
          </div>
          <strong>{money(s.expense)}</strong>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <h2>Transações recentes</h2>
            <Link to="/transacoes">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>
          {transactions.data!.transactions.items.length ? (
            <TransactionList compact items={transactions.data!.transactions.items} />
          ) : (
            <EmptyState
              title="Sua organização começa aqui"
              description="Registre sua primeira transação para acompanhar suas finanças."
            />
          )}
          <Button variant="ghost" className="panel-footer" onClick={() => setDialog('transaction')}>
            <Plus size={17} />
            Nova transação
          </Button>
        </section>
        <section className="panel categories-panel">
          <div className="panel-heading">
            <h2>Categorias</h2>
            <Link to="/categorias">
              Gerenciar <ChevronRight size={16} />
            </Link>
          </div>
          {cats.length ? (
            <div className="category-overview">
              {cats.map((c) => (
                <Link to={`/transacoes?categoria=${c.id}`} key={c.id}>
                  <Badge category={c} />
                  <span>
                    {c.transactionCount} {c.transactionCount === 1 ? 'item' : 'itens'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="small-empty">
              <p>Crie categorias para organizar suas receitas e despesas.</p>
              <Button variant="secondary" onClick={() => setDialog('category')}>
                <Plus size={16} />
                Nova categoria
              </Button>
            </div>
          )}
        </section>
      </div>
      {dialog === 'transaction' && (
        <TransactionDialog
          onClose={() => setDialog(null)}
          onCreateCategory={() => setDialog('category')}
        />
      )}
      {dialog === 'category' && <CategoryDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
