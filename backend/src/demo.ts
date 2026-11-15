import { hash } from 'bcryptjs';
import { prisma } from './db.js';
const email = 'demo@financy.local';
try {
  if (await prisma.user.findUnique({ where: { email } })) {
    console.info('A conta de demonstração já existe. Os dados atuais foram preservados.');
  } else {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const day = (d: number) =>
      `${yyyy}-${mm}-${String(Math.min(now.getDate(), d)).padStart(2, '0')}`;
    const user = await prisma.user.create({
      data: { name: 'Conta demonstração', email, passwordHash: await hash('Financy2026!', 12) },
    });
    const entries = [
      {
        name: 'Alimentação',
        description: 'Restaurantes, delivery e refeições',
        color: 'blue',
        icon: 'utensils',
      },
      {
        name: 'Entretenimento',
        description: 'Cinemas, jogos e lazer',
        color: 'pink',
        icon: 'ticket',
      },
      {
        name: 'Investimento',
        description: 'Aplicações e retornos financeiros',
        color: 'green',
        icon: 'piggy-bank',
      },
      {
        name: 'Mercado',
        description: 'Compras de supermercado e mantimentos',
        color: 'orange',
        icon: 'shopping-cart',
      },
      {
        name: 'Salário',
        description: 'Renda mensal e bonificações',
        color: 'green',
        icon: 'briefcase',
      },
      {
        name: 'Saúde',
        description: 'Medicamentos, consultas e exames',
        color: 'red',
        icon: 'heart',
      },
      {
        name: 'Transporte',
        description: 'Gasolina, transporte público e viagens',
        color: 'purple',
        icon: 'car',
      },
      {
        name: 'Utilidades',
        description: 'Energia, água, internet e telefone',
        color: 'yellow',
        icon: 'house',
      },
    ];
    await prisma.$transaction(async (tx) => {
      const categories = await Promise.all(
        entries.map((c) => tx.category.create({ data: { ...c, userId: user.id } })),
      );
      const rows: [string, number, string, number, number][] = [
        ['Pagamento de salário', 425000, 'INCOME', 4, 1],
        ['Jantar no restaurante', 8990, 'EXPENSE', 0, 15],
        ['Posto de gasolina', 10000, 'EXPENSE', 6, 14],
        ['Compras no mercado', 15680, 'EXPENSE', 3, 13],
        ['Retorno de investimento', 34025, 'INCOME', 2, 12],
        ['Aluguel', 170000, 'EXPENSE', 7, 5],
        ['Freelance', 250000, 'INCOME', 4, 8],
        ['Cinema', 8800, 'EXPENSE', 1, 11],
        ['Café da manhã', 2450, 'EXPENSE', 0, 10],
        ['Internet', 9990, 'EXPENSE', 7, 7],
        ['Farmácia', 6590, 'EXPENSE', 5, 6],
        ['Compras da semana', 18990, 'EXPENSE', 3, 9],
      ];
      await tx.transaction.createMany({
        data: rows.map(([description, amount, type, cat, d]) => ({
          description,
          amount,
          type,
          categoryId: categories[cat].id,
          userId: user.id,
          date: day(d),
        })),
      });
    });
    console.info('Demonstração criada: demo@financy.local / Financy2026! (dados fictícios).');
  }
} finally {
  await prisma.$disconnect();
}
