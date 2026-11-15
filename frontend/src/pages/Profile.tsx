import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Mail, UserRound } from 'lucide-react';
import { useAuth, useMe } from '../auth';
import { errorMessage, request } from '../api';
import { Button, Feedback, Field, initials } from '../components/ui';
const schema = z.object({ name: z.string().trim().min(2, 'Informe seu nome completo.').max(100) });
export function Profile() {
  const { data } = useMe();
  const { signOut } = useAuth();
  const cache = useQueryClient();
  const user = data!.me;
  const [feedback, setFeedback] = useState('');
  const form = useForm<{ name: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name },
  });
  const save = useMutation({
    mutationFn: (values: { name: string }) =>
      request(
        'mutation UpdateProfile($name:String!){updateProfile(name:$name){id name email}}',
        values,
      ),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['me'] });
      setFeedback('Alterações salvas com sucesso.');
    },
    onError: (e) => setFeedback(errorMessage(e)),
  });
  return (
    <div className="profile-page">
      <section className="panel profile-card">
        <div className="profile-heading">
          <span className="avatar large">{initials(user.name)}</span>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
        <form
          noValidate
          className="form-stack"
          onSubmit={form.handleSubmit((v) => {
            setFeedback('');
            save.mutate(v);
          })}
        >
          <Field
            id="profile-name"
            label="Nome completo"
            error={form.formState.errors.name?.message}
          >
            <div className="input-icon">
              <UserRound size={18} />
              <input
                id="profile-name"
                autoComplete="name"
                {...form.register('name')}
                aria-invalid={!!form.formState.errors.name}
                aria-describedby="profile-name-error"
              />
            </div>
          </Field>
          <Field id="profile-email" label="E-mail" hint="O e-mail não pode ser alterado">
            <div className="input-icon">
              <Mail size={18} />
              <input id="profile-email" type="email" value={user.email} disabled />
            </div>
          </Field>
          {feedback && <Feedback message={feedback} error={save.isError} />}
          <Button className="w-full" type="submit" loading={save.isPending}>
            Salvar alterações
          </Button>
          <Button className="w-full" variant="secondary" type="button" onClick={signOut}>
            <LogOut size={17} className="expense" />
            Sair da conta
          </Button>
        </form>
      </section>
    </div>
  );
}
