import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { CATEGORIES, errorMessage, request } from '../api';
import type { Category } from '../types';
import { Badge, Button, CategoryIcon, EmptyState, ErrorState, IconButton } from '../components/ui';
import { CategoryDialog } from '../components/CategoryDialog';
import { DeleteDialog } from '../components/DeleteDialog';
export function Categories() {
  const [editing, setEditing] = useState<Category | undefined>();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const data = useQuery({
    queryKey: ['categories'],
    queryFn: () => request<{ categories: Category[] }>(CATEGORIES),
  });
  const cats = data.data?.categories ?? [];
  const most = [...cats].sort((a, b) => b.transactionCount - a.transactionCount)[0];
  const total = cats.reduce((sum, c) => sum + c.transactionCount, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Categorias</h1>
          <p>Organize suas transações por categorias</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus size={18} />
          Nova categoria
        </Button>
      </div>
      {data.isPending ? (
        <div className="loading-page" role="status">
          Carregando categorias…
        </div>
      ) : data.isError ? (
        <ErrorState message={errorMessage(data.error)} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <div className="summary-grid category-stats">
            <section className="summary-card">
              <Tag size={23} />
              <div>
                <strong>{cats.length}</strong>
                <h2>Total de categorias</h2>
              </div>
            </section>
            <section className="summary-card">
              <ArrowDownUp className="purple-text" size={23} />
              <div>
                <strong>{total}</strong>
                <h2>Total de transações</h2>
              </div>
            </section>
            <section className="summary-card">
              {most && total > 0 ? <CategoryIcon category={most} /> : <Tag size={23} />}
              <div>
                <strong className="category-stat-name">{total > 0 ? most?.name : '—'}</strong>
                <h2>Categoria mais utilizada</h2>
              </div>
            </section>
          </div>
          {cats.length ? (
            <div className="category-grid">
              {cats.map((c) => (
                <article className="panel category-card" key={c.id}>
                  <div className="category-card-top">
                    <CategoryIcon category={c} />
                    <div>
                      <IconButton
                        className="danger-icon"
                        label={`Excluir ${c.name}`}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 size={17} />
                      </IconButton>
                      <IconButton
                        label={`Editar ${c.name}`}
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </div>
                  </div>
                  <h2>{c.name}</h2>
                  <p>{c.description || 'Sem descrição'}</p>
                  <footer>
                    <Badge category={c} />
                    <span>
                      {c.transactionCount} {c.transactionCount === 1 ? 'item' : 'itens'}
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <section className="panel">
              <EmptyState
                title="Cada coisa em seu lugar"
                description="Crie categorias para organizar suas receitas e despesas."
                action={
                  <Button onClick={() => setOpen(true)}>
                    <Plus size={17} />
                    Nova categoria
                  </Button>
                }
              />
            </section>
          )}
        </>
      )}
      {open && <CategoryDialog category={editing} onClose={() => setOpen(false)} />}
      {deleting && (
        <DeleteDialog
          kind="category"
          id={deleting.id}
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
