// The module's public surface (R4). Anything not listed here is internal —
// notably `makeUserRepository`, which is the module's private implementation.
// Other modules reach this one through `UserService` and nothing else (R2); the
// composition root is the single exception, because wiring a repository into a
// service is precisely its job (§5, §14 step 8).
export { userRoutes } from './user.routes';
export { makeUserService, type UserService } from './user.service';
export {
	UserSchema,
	CreateUserSchema,
	UpdateUserSchema,
	IdParamSchema,
	type User,
	type CreateUserInput,
	type UpdateUserInput,
} from './user.schema';
