import type { FastifyReply } from 'fastify';
import prisma from '@/structures/database.js';
import type { RequestWithUser } from '@/structures/interfaces.js';

export const options = {
	url: '/admin/user/:uuid/enable',
	method: 'post',
	middlewares: ['auth', 'admin']
};

export const run = async (req: RequestWithUser, res: FastifyReply) => {
	const { uuid } = req.params as { uuid?: string };
	if (!uuid) {
		res.badRequest('Invalid uuid supplied');
		return;
	}

	if (uuid === req.user.uuid) {
		res.badRequest("You can't apply this action to yourself");
		return;
	}

	const user = await prisma.users.findUnique({
		where: {
			uuid
		},
		include: {
			roles: {
				select: {
					name: true
				}
			}
		}
	});

	if (
		user?.roles.some(role => role.name === 'admin' || role.name === 'owner') &&
		!req.user.roles.some(role => role.name === 'owner')
	) {
		res.badRequest('You cannot enable another admin or owner');
		return;
	}

	if (user?.enabled) {
		res.badRequest('User is already enabled');
		return;
	}

	await prisma.users.update({
		where: {
			uuid
		},
		data: {
			enabled: true
		}
	});

	return res.send({
		message: 'Successfully enabled user'
	});
};
