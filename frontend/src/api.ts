import { GraphQLClient, ClientError } from 'graphql-request';
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});
const endpoint = new URL(
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/graphql',
  window.location.origin,
);
const client = new GraphQLClient(endpoint.toString());
export function token() {
  return localStorage.getItem('financy.token') ?? sessionStorage.getItem('financy.token');
}
export async function request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const auth = token();
  try {
    return await client.request<T>(
      query,
      variables,
      auth ? { authorization: `Bearer ${auth}` } : {},
    );
  } catch (e) {
    if (
      e instanceof ClientError &&
      e.response.errors?.some((err) => err.extensions?.code === 'UNAUTHENTICATED') &&
      auth
    ) {
      localStorage.removeItem('financy.token');
      sessionStorage.removeItem('financy.token');
      window.dispatchEvent(new Event('financy:logout'));
    }
    throw e;
  }
}
export function errorMessage(e: unknown) {
  if (e instanceof ClientError)
    return e.response.errors?.[0]?.message ?? 'Não foi possível concluir. Tente novamente.';
  return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
}
export const CATEGORY_FIELDS = 'id name description color icon transactionCount';
export const TRANSACTION_FIELDS = `id description amount type date category { ${CATEGORY_FIELDS} }`;
export const CATEGORIES = `query { categories { ${CATEGORY_FIELDS} } }`;
export const TRANSACTIONS = `query Transactions($filter:TransactionFilter,$page:Int,$pageSize:Int){transactions(filter:$filter,page:$page,pageSize:$pageSize){total items{${TRANSACTION_FIELDS}}}}`;
export const SUMMARY = `query Summary($month:String){summary(month:$month){balance income expense}}`;
