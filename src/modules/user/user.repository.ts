export function makeUserRepository(db: unknown) {
	return {
		async findById(id: string) {
			// TODO
		},
		async findByEmail(email: string) {
			// TODO
		},
		async create(data: unknown) {
			// TODO
		},
		async findMany(filters?: unknown) {
			// TODO
		},
		async findAll() {
			// TODO
		},
		async update(id: string, data: unknown) {
			// TODO
		},
		async delete(id: string) {
			// TODO
		},
		async softDelete(id: string) {
			// TODO
		},
	};
}

export type UserRepository = ReturnType<typeof makeUserRepository>;
