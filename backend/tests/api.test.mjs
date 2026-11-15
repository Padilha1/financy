import 'reflect-metadata';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { graphql } from 'graphql';
import { createSchema } from '../dist/schema.js';
import { prisma } from '../dist/db.js';
import { contextFor } from '../dist/auth.js';
const schema = await createSchema();
const anon = { userId: null };
async function call(source, variables = {}, ctx = anon) {
  return graphql({ schema, source, variableValues: variables, contextValue: ctx });
}
function ok(result) {
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  return result.data;
}
function error(result, match) {
  assert.ok(result.errors?.length);
  assert.match(result.errors[0].message, match);
}
const categoryInput = {
  name: 'Alimentação',
  description: 'Restaurantes e refeições',
  color: 'blue',
  icon: 'utensils',
};
const createCategory =
  'mutation($input:CategoryInput!){createCategory(input:$input){id name description color icon transactionCount}}';
const createTransaction =
  'mutation($input:TransactionInput!){createTransaction(input:$input){id amount description type date category{id}}}';
let a, b, categoryA, categoryB, expense;
after(async () => {
  await prisma.$disconnect();
});

test('Financy API — autenticação, isolamento e CRUD com PostgreSQL real', async (t) => {
  await t.test('cadastro normaliza email, armazena hash e login valida senha', async () => {
    const register =
      'mutation($input:RegisterInput!){register(input:$input){token user{id name email}}}';
    a = ok(
      await call(register, {
        input: { name: 'Conta A', email: ' A@EXAMPLE.TEST ', password: 'senha-teste-123' },
      }),
    ).register;
    b = ok(
      await call(register, {
        input: { name: 'Conta B', email: 'b@example.test', password: 'senha-teste-123' },
      }),
    ).register;
    assert.equal(a.user.email, 'a@example.test');
    const row = await prisma.user.findUnique({ where: { id: a.user.id } });
    assert.notEqual(row.passwordHash, 'senha-teste-123');
    assert.match(row.passwordHash, /^\$2/);
    assert.equal((await contextFor(`Bearer ${a.token}`)).userId, a.user.id);
    assert.equal((await contextFor('Bearer adulterado')).userId, null);
    const login = 'mutation($input:LoginInput!){login(input:$input){token user{id}}}';
    assert.equal(
      ok(await call(login, { input: { email: 'a@example.test', password: 'senha-teste-123' } }))
        .login.user.id,
      a.user.id,
    );
    error(
      await call(login, { input: { email: 'a@example.test', password: 'errada' } }),
      /incorretos/,
    );
    error(
      await call(register, {
        input: { name: 'Duplicado', email: 'a@example.test', password: 'senha-teste-123' },
      }),
      /cadastrar/,
    );
  });
  const ctxA = () => ({ userId: a.user.id });
  const ctxB = () => ({ userId: b.user.id });
  await t.test('consultas e mutações privadas exigem autenticação', async () => {
    for (const source of [
      '{me{id}}',
      '{categories{id}}',
      '{transactions{total}}',
      '{summary{balance}}',
    ])
      error(await call(source), /sessão expirou/);
    error(await call(createCategory, { input: categoryInput }), /sessão expirou/);
  });
  await t.test(
    'cria, lista e edita categorias; rejeita duplicação e conteúdo inválido',
    async () => {
      categoryA = ok(await call(createCategory, { input: categoryInput }, ctxA())).createCategory;
      categoryB = ok(
        await call(
          createCategory,
          { input: { ...categoryInput, name: 'Salário', color: 'green', icon: 'briefcase' } },
          ctxB(),
        ),
      ).createCategory;
      error(await call(createCategory, { input: categoryInput }, ctxA()), /Já existe/);
      error(
        await call(createCategory, { input: { ...categoryInput, color: 'invalid' } }, ctxA()),
        /Invalid option/,
      );
      assert.equal(ok(await call('{categories{id}}', {}, ctxA())).categories.length, 1);
      ok(
        await call(
          'mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){name}}',
          { id: categoryA.id, input: { ...categoryInput, description: 'Atualizada' } },
          ctxA(),
        ),
      );
    },
  );
  await t.test('não expõe nem permite editar ou remover categorias de outra conta', async () => {
    const rows = ok(await call('{categories{id}}', {}, ctxB())).categories;
    assert.deepEqual(
      rows.map((r) => r.id),
      [categoryB.id],
    );
    error(
      await call(
        'mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}',
        { id: categoryA.id, input: categoryInput },
        ctxB(),
      ),
      /não encontrado/,
    );
    error(
      await call('mutation($id:ID!){deleteCategory(id:$id)}', { id: categoryA.id }, ctxB()),
      /não encontrado/,
    );
  });
  await t.test('cria receitas e despesas em centavos e rejeita categoria alheia', async () => {
    const input = {
      description: 'Almoço',
      amount: 8990,
      type: 'EXPENSE',
      date: '2026-11-15',
      categoryId: categoryA.id,
    };
    expense = ok(await call(createTransaction, { input }, ctxA())).createTransaction;
    ok(
      await call(
        createTransaction,
        { input: { ...input, description: 'Salário', type: 'INCOME', amount: 500000 } },
        ctxA(),
      ),
    );
    ok(
      await call(
        createTransaction,
        { input: { ...input, description: 'Outubro', date: '2026-10-01', amount: 1000 } },
        ctxA(),
      ),
    );
    error(
      await call(createTransaction, { input: { ...input, categoryId: categoryB.id } }, ctxA()),
      /sua conta/,
    );
    for (const invalid of [
      { amount: 0 },
      { amount: -100 },
      { type: 'INVALID' },
      { date: '2026-02-30' },
      { description: ' ' },
    ])
      error(await call(createTransaction, { input: { ...input, ...invalid } }, ctxA()), /./);
  });
  await t.test('filtra por mês, texto, tipo e categoria, com paginação real', async () => {
    const query =
      'query($filter:TransactionFilter,$page:Int,$pageSize:Int){transactions(filter:$filter,page:$page,pageSize:$pageSize){total items{id}}}';
    const result = ok(
      await call(
        query,
        {
          filter: { month: '2026-11', type: 'EXPENSE', categoryId: categoryA.id, search: 'almoço' },
        },
        ctxA(),
      ),
    ).transactions;
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, expense.id);
    const second = ok(await call(query, { page: 2, pageSize: 1 }, ctxA())).transactions;
    assert.equal(second.total, 3);
    assert.equal(second.items.length, 1);
    assert.equal(ok(await call(query, {}, ctxB())).transactions.total, 0);
    error(await call(query, { page: 0 }, ctxA()), /Paginação/);
  });
  await t.test('calcula saldo histórico e totais do mês sem erro de ponto flutuante', async () => {
    const s = ok(
      await call(
        'query($month:String){summary(month:$month){balance income expense}}',
        { month: '2026-11' },
        ctxA(),
      ),
    ).summary;
    assert.deepEqual({ ...s }, { balance: 490010, income: 500000, expense: 8990 });
    const counts = ok(await call('{categories{id transactionCount}}', {}, ctxA())).categories;
    assert.equal(counts[0].transactionCount, 3);
  });
  await t.test('bloqueia alteração e exclusão de transações de outra conta', async () => {
    const input = {
      description: 'Ataque',
      amount: 1,
      type: 'EXPENSE',
      date: '2026-11-15',
      categoryId: categoryB.id,
    };
    error(
      await call(
        'mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id}}',
        { id: expense.id, input },
        ctxB(),
      ),
      /não encontrado/,
    );
    error(
      await call('mutation($id:ID!){deleteTransaction(id:$id)}', { id: expense.id }, ctxB()),
      /não encontrada/,
    );
  });
  await t.test('edita transação e preserva categorias com transações vinculadas', async () => {
    ok(
      await call(
        'mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){amount}}',
        {
          id: expense.id,
          input: {
            description: 'Jantar',
            amount: 12000,
            type: 'EXPENSE',
            date: '2026-11-16',
            categoryId: categoryA.id,
          },
        },
        ctxA(),
      ),
    );
    error(
      await call('mutation($id:ID!){deleteCategory(id:$id)}', { id: categoryA.id }, ctxA()),
      /possui transações/,
    );
  });
  await t.test(
    'atualiza perfil apenas da própria conta e não permite consultar senha',
    async () => {
      assert.equal(
        ok(await call('mutation{updateProfile(name:"Novo nome"){name}}', {}, ctxA())).updateProfile
          .name,
        'Novo nome',
      );
      error(await call('{me{passwordHash}}', {}, ctxA()), /Cannot query field/);
    },
  );
  await t.test('exclui transações e categoria sem vínculos', async () => {
    ok(await call('mutation($id:ID!){deleteTransaction(id:$id)}', { id: expense.id }, ctxA()));
    ok(await call('mutation($id:ID!){deleteCategory(id:$id)}', { id: categoryB.id }, ctxB()));
    assert.equal(ok(await call('{categories{id}}', {}, ctxB())).categories.length, 0);
  });
});
