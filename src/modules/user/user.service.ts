import { UserRepository } from './user.repository';

export interface UserServiceDep {
	userRepo: UserRepository;
}

export function makeUserService(deps: UserServiceDep) {
	const { userRepo } = deps;

	return {
		async getUsers() {},
		async updateUser(data: unknown) {},
		async deleteUser(id: string) {},
	};
}

export type UserService = ReturnType<typeof makeUserService>;
