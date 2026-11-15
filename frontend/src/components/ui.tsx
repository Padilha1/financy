import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BriefcaseBusiness,
  CarFront,
  Check,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  House,
  LoaderCircle,
  PiggyBank,
  Plane,
  ReceiptText,
  ShoppingCart,
  Smartphone,
  Ticket,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../types';
export const icons: Record<string, { label: string; component: LucideIcon }> = {
  briefcase: { label: 'Trabalho', component: BriefcaseBusiness },
  car: { label: 'Transporte', component: CarFront },
  utensils: { label: 'Alimentação', component: Utensils },
  'shopping-cart': { label: 'Compras', component: ShoppingCart },
  ticket: { label: 'Entretenimento', component: Ticket },
  'piggy-bank': { label: 'Investimento', component: PiggyBank },
  house: { label: 'Casa', component: House },
  heart: { label: 'Saúde', component: Heart },
  'graduation-cap': { label: 'Educação', component: GraduationCap },
  gift: { label: 'Presente', component: Gift },
  plane: { label: 'Viagem', component: Plane },
  wallet: { label: 'Carteira', component: Wallet },
  coffee: { label: 'Café', component: Coffee },
  dumbbell: { label: 'Academia', component: Dumbbell },
  smartphone: { label: 'Tecnologia', component: Smartphone },
  receipt: { label: 'Contas', component: ReceiptText },
};
export const colors: Record<string, string> = {
  green: 'Verde',
  blue: 'Azul',
  purple: 'Roxo',
  pink: 'Rosa',
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
};
export function Logo({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <img
      className={iconOnly ? 'logo logo-icon' : 'logo'}
      src={iconOnly ? '/brand/financy-icon.svg' : '/brand/financy-logo.svg'}
      alt="Financy"
      width={iconOnly ? 40 : 134}
      height={iconOnly ? 40 : 32}
      decoding="async"
    />
  );
}
export function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`button ${variant} ${className}`}
      aria-busy={loading || undefined}
    >
      {loading && <LoaderCircle className="spin" size={17} />} {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      {...props}
      className={`icon-button ${props.className ?? ''}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
export function CategoryIcon({ category }: { category: Pick<Category, 'icon' | 'color'> }) {
  const Icon = icons[category.icon]?.component ?? ReceiptText;
  return (
    <span className={`category-icon tone-${category.color}`}>
      <Icon size={20} />
    </span>
  );
}
export function Badge({ category }: { category: Pick<Category, 'name' | 'color'> }) {
  return <span className={`badge tone-${category.color}`}>{category.name}</span>;
}
export function TypeLabel({ type }: { type: string }) {
  return (
    <span className={`type-label ${type === 'INCOME' ? 'income' : 'expense'}`}>
      {type === 'INCOME' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}{' '}
      {type === 'INCOME' ? 'Entrada' : 'Saída'}
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const returnFocus = useRef(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Fechar">
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Wallet size={32} strokeWidth={1.4} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
export function Feedback({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p className={error ? 'form-error' : 'form-success'} role={error ? 'alert' : 'status'}>
      {!error && <Check size={16} />} {message}
    </p>
  );
}
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const today = () => new Date().toLocaleDateString('sv-SE');
export const currentMonth = () => today().slice(0, 7);
export const displayDate = (value: string) => value.split('-').reverse().join('/');
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
