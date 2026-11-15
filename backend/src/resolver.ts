import { Arg, Authorized, Ctx, ID, Int, Mutation, Query, Resolver } from 'type-graphql';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { fail, issueToken, type Context } from './auth.js';
import {
  AuthPayload,
  Category,
  CategoryInput,
  LoginInput,
  RegisterInput,
  Summary,
  Transaction,
  TransactionFilter,
  TransactionInput,
  TransactionPage,
  User,
} from './models.js';
import {
  categorySchema,
  filterSchema,
  loginSchema,
  parse,
  registerSchema,
  transactionSchema,
} from './validation.js';

function categoryView(c: {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  _count?: { transactions: number };
}) {
  return { ...c, transactionCount: c._count?.transactions ?? 0 };
}
function knownDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') fail('Já existe uma categoria com esse título.');
    if (error.code === 'P2003')
      fail('Esta categoria possui transações. Altere ou exclua as transações antes de removê-la.');
    if (error.code === 'P2025') fail('Registro não encontrado.', 'NOT_FOUND');
  }
  throw error;
}
@Resolver()
export class FinancyResolver {
  @Mutation(() => AuthPayload)
  async register(@Arg('input', () => RegisterInput) input: RegisterInput) {
    const data = parse(registerSchema, input);
    const passwordHash = await hash(data.password, 12);
    try {
      const user = await prisma.user.create({
        data: { name: data.name, email: data.email, passwordHash },
      });
      return { user, token: issueToken(user.id) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        fail('Não foi possível cadastrar este e-mail. Tente entrar na sua conta.');
      throw e;
    }
  }
  @Mutation(() => AuthPayload)
  async login(@Arg('input', () => LoginInput) input: LoginInput) {
    const data = parse(loginSchema, input);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    // A fixed valid hash keeps password comparison work for unknown accounts as well.
    const valid = await compare(
      data.password,
      user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
    );
    if (!user || !valid) fail('E-mail ou senha incorretos.', 'UNAUTHENTICATED');
    return { user, token: issueToken(user.id) };
  }
  @Authorized()
  @Query(() => User)
  async me(@Ctx() ctx: Context) {
    return prisma.user.findUniqueOrThrow({ where: { id: ctx.userId! } });
  }
  @Authorized()
  @Mutation(() => User)
  async updateProfile(@Arg('name', () => String) name: string, @Ctx() ctx: Context) {
    const clean = parse(registerSchema.shape.name, name);
    return prisma.user.update({ where: { id: ctx.userId! }, data: { name: clean } });
  }
  @Authorized()
  @Query(() => [Category])
  async categories(@Ctx() ctx: Context) {
    const rows = await prisma.category.findMany({
      where: { userId: ctx.userId! },
      include: { _count: { select: { transactions: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(categoryView);
  }
  @Authorized()
  @Mutation(() => Category)
  async createCategory(
    @Arg('input', () => CategoryInput) input: CategoryInput,
    @Ctx() ctx: Context,
  ) {
    const data = parse(categorySchema, input);
    try {
      return categoryView(await prisma.category.create({ data: { ...data, userId: ctx.userId! } }));
    } catch (e) {
      return knownDatabaseError(e);
    }
  }
  @Authorized()
  @Mutation(() => Category)
  async updateCategory(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => CategoryInput) input: CategoryInput,
    @Ctx() ctx: Context,
  ) {
    const data = parse(categorySchema, input);
    try {
      return categoryView(
        await prisma.category.update({
          where: { id, userId: ctx.userId! },
          data,
          include: { _count: { select: { transactions: true } } },
        }),
      );
    } catch (e) {
      return knownDatabaseError(e);
    }
  }
  @Authorized()
  @Mutation(() => Boolean)
  async deleteCategory(@Arg('id', () => ID) id: string, @Ctx() ctx: Context) {
    try {
      await prisma.category.delete({ where: { id, userId: ctx.userId! } });
      return true;
    } catch (e) {
      return knownDatabaseError(e);
    }
  }
  @Authorized()
  @Query(() => TransactionPage)
  async transactions(
    @Ctx() ctx: Context,
    @Arg('filter', () => TransactionFilter, { nullable: true }) filter?: TransactionFilter,
    @Arg('page', () => Int, { defaultValue: 1 }) page = 1,
    @Arg('pageSize', () => Int, { defaultValue: 10 }) pageSize = 10,
  ) {
    if (page < 1 || pageSize < 1 || pageSize > 100) fail('Paginação inválida.');
    const f = parse(filterSchema, filter ?? {});
    const where: Prisma.TransactionWhereInput = {
      userId: ctx.userId!,
      ...(f.search ? { description: { contains: f.search, mode: 'insensitive' } } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.categoryId ? { categoryId: f.categoryId } : {}),
      ...(f.month ? { date: { startsWith: f.month } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);
    return { items: items.map((t) => ({ ...t, category: categoryView(t.category) })), total };
  }
  @Authorized()
  @Query(() => Summary)
  async summary(
    @Ctx() ctx: Context,
    @Arg('month', () => String, { nullable: true }) month?: string,
  ) {
    const f = parse(filterSchema, { month });
    const [all, monthly] = await prisma.$transaction([
      prisma.transaction.groupBy({
        by: ['type'],
        orderBy: { type: 'asc' },
        where: { userId: ctx.userId! },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        orderBy: { type: 'asc' },
        where: { userId: ctx.userId!, ...(f.month ? { date: { startsWith: f.month } } : {}) },
        _sum: { amount: true },
      }),
    ]);
    const sum = (rows: typeof all, type: string) =>
      rows.find((r) => r.type === type)?._sum?.amount ?? 0;
    return {
      balance: sum(all, 'INCOME') - sum(all, 'EXPENSE'),
      income: sum(monthly, 'INCOME'),
      expense: sum(monthly, 'EXPENSE'),
    };
  }
  private async checkCategory(categoryId: string, userId: string) {
    if (
      !(await prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      }))
    )
      fail('Selecione uma categoria da sua conta.');
  }
  @Authorized()
  @Mutation(() => Transaction)
  async createTransaction(
    @Arg('input', () => TransactionInput) input: TransactionInput,
    @Ctx() ctx: Context,
  ) {
    const data = parse(transactionSchema, input);
    await this.checkCategory(data.categoryId, ctx.userId!);
    const row = await prisma.transaction.create({
      data: { ...data, userId: ctx.userId! },
      include: { category: true },
    });
    return { ...row, category: categoryView(row.category) };
  }
  @Authorized()
  @Mutation(() => Transaction)
  async updateTransaction(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => TransactionInput) input: TransactionInput,
    @Ctx() ctx: Context,
  ) {
    const data = parse(transactionSchema, input);
    await this.checkCategory(data.categoryId, ctx.userId!);
    try {
      const row = await prisma.transaction.update({
        where: { id, userId: ctx.userId! },
        data,
        include: { category: true },
      });
      return { ...row, category: categoryView(row.category) };
    } catch (e) {
      return knownDatabaseError(e);
    }
  }
  @Authorized()
  @Mutation(() => Boolean)
  async deleteTransaction(@Arg('id', () => ID) id: string, @Ctx() ctx: Context) {
    const result = await prisma.transaction.deleteMany({ where: { id, userId: ctx.userId! } });
    if (!result.count) fail('Transação não encontrada.', 'NOT_FOUND');
    return true;
  }
}
