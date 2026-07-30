// core/types.ts
import { Logger } from './logger';
import { RawBindings } from '@/env';
import { Container } from '@/container';
import { Principal } from '@/auth/principal';

export type AppVariables = {
	container: Container;
	requestId: string;
	principal: Principal | null;
	logger: Logger;
};
export type AppEnv = {
	Bindings: RawBindings;
	Variables: AppVariables;
};
