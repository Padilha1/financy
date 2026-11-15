import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../auth';
import { errorMessage, request } from '../api';
import type { AuthPayload } from '../types';
import { Button, Feedback, Field, IconButton, Logo } from '../components/ui';
const schema = z.object({
  name: z.string().optional(),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function AuthPage({ register = false }: { register?: boolean }) {
  const { authenticated, signIn } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const validation = register
    ? schema.extend({
        name: z.string().trim().min(2, 'Informe seu nome completo.').max(100),
        password: z
          .string()
          .min(8, 'Use pelo menos 8 caracteres.')
          .max(72, 'Use até 72 caracteres.'),
      })
    : schema;
  const form = useForm<Values>({
    resolver: zodResolver(validation),
    defaultValues: { name: '', email: '', password: '', remember: true },
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const { remember, name, ...rest } = values;
      const result = await request<Record<string, AuthPayload>>(
        `mutation Authenticate($input:${register ? 'RegisterInput' : 'LoginInput'}!){${register ? 'register' : 'login'}(input:$input){token user{id name email}}}`,
        { input: register ? { ...rest, name } : rest },
      );
      signIn(result[register ? 'register' : 'login'], remember);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  if (authenticated) return <Navigate to="/" replace />;
  const errors = form.formState.errors;
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link to="/" className="auth-logo" aria-label="Financy">
          <Logo />
        </Link>
        <section className="auth-card">
          <div className="auth-heading">
            <h1>{register ? 'Criar conta' : 'Fazer login'}</h1>
            <p>
              {register
                ? 'Comece a controlar suas finanças de forma simples'
                : 'Entre na sua conta para continuar'}
            </p>
          </div>
          <form
            noValidate
            className="form-stack"
            onSubmit={form.handleSubmit((v) => {
              setError('');
              mutation.mutate(v);
            })}
          >
            {register && (
              <Field id="name" label="Nome completo" error={errors.name?.message}>
                <div className="input-icon">
                  <UserRound size={18} />
                  <input
                    id="name"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    {...form.register('name')}
                    aria-invalid={!!errors.name}
                    aria-describedby="name-error"
                  />
                </div>
              </Field>
            )}
            <Field id="email" label="E-mail" error={errors.email?.message}>
              <div className="input-icon">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="mail@exemplo.com"
                  {...form.register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby="email-error"
                />
              </div>
            </Field>
            <Field
              id="password"
              label="Senha"
              error={errors.password?.message}
              hint={register ? 'A senha deve ter no mínimo 8 caracteres.' : undefined}
            >
              <div className="input-icon password-input">
                <LockKeyhole size={18} />
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="Digite sua senha"
                  {...form.register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'password-error' : register ? 'password-hint' : undefined
                  }
                />
                <IconButton
                  label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </div>
            </Field>
            {!register && (
              <label className="checkbox-label">
                <input type="checkbox" {...form.register('remember')} />
                Lembrar de mim
              </label>
            )}
            {error && <Feedback message={error} error />}
            <Button type="submit" loading={mutation.isPending} className="w-full">
              {register ? 'Cadastrar' : 'Entrar'}
            </Button>
          </form>
          <div className="auth-divider">
            <span>{register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}</span>
          </div>
          <Link className="button secondary w-full" to={register ? '/' : '/cadastro'}>
            {register ? 'Fazer login' : 'Criar conta'}
          </Link>
        </section>
      </div>
    </main>
  );
}
