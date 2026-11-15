import { Field, Float, ID, InputType, Int, ObjectType } from 'type-graphql';

@ObjectType()
export class User {
  @Field(() => ID) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) email!: string;
}
@ObjectType()
export class AuthPayload {
  @Field(() => String) token!: string;
  @Field(() => User) user!: User;
}
@ObjectType()
export class Category {
  @Field(() => ID) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => String) color!: string;
  @Field(() => String) icon!: string;
  @Field(() => Int) transactionCount!: number;
}
@ObjectType()
export class Transaction {
  @Field(() => ID) id!: string;
  @Field(() => String) description!: string;
  /** Monetary values are always integer cents. */
  @Field(() => Int) amount!: number;
  @Field(() => String) type!: string;
  @Field(() => String) date!: string;
  @Field(() => Category) category!: Category;
}
@InputType()
export class RegisterInput {
  @Field(() => String) name!: string;
  @Field(() => String) email!: string;
  @Field(() => String) password!: string;
}
@InputType()
export class LoginInput {
  @Field(() => String) email!: string;
  @Field(() => String) password!: string;
}
@InputType()
export class CategoryInput {
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => String) color!: string;
  @Field(() => String) icon!: string;
}
@InputType()
export class TransactionInput {
  @Field(() => String) description!: string;
  @Field(() => Int) amount!: number;
  @Field(() => String) type!: string;
  @Field(() => String) date!: string;
  @Field(() => ID) categoryId!: string;
}
@InputType()
export class TransactionFilter {
  @Field(() => String, { nullable: true }) search?: string;
  @Field(() => String, { nullable: true }) type?: string;
  @Field(() => String, { nullable: true }) categoryId?: string;
  @Field(() => String, { nullable: true }) month?: string;
}
@ObjectType()
export class TransactionPage {
  @Field(() => [Transaction]) items!: Transaction[];
  @Field(() => Int) total!: number;
}
@ObjectType()
export class Summary {
  @Field(() => Float) balance!: number;
  @Field(() => Float) income!: number;
  @Field(() => Float) expense!: number;
}
