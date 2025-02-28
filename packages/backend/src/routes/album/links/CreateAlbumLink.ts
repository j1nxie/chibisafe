import type { FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/structures/database.js';
import type { RequestWithUser } from '@/structures/interfaces.js';
import { getUniqueAlbumIdentifier } from '@/utils/Util.js';

export const options = {
	url: '/album/:uuid/link',
	method: 'post',
	middlewares: ['apiKey', 'auth']
};

export const run = async (req: RequestWithUser, res: FastifyReply) => {
	const { uuid } = req.params as { uuid: string };

	const exists = await prisma.albums.findFirst({
		where: {
			uuid,
			userId: req.user.id
		}
	});

	if (!exists) {
		res.badRequest("Album doesn't exist or doesn't belong to the user");
		return;
	}

	let { identifier } = req.body as { identifier?: string };
	if (identifier) {
		if (!req.user?.roles.some(role => role.name === 'admin')) {
			res.unauthorized('Only administrators can create custom links');
			return;
		}

		if (!/^[\w-]+$/.test(identifier)) {
			res.badRequest('Only alphanumeric, dashes, and underscore characters are allowed');
			return;
		}

		const identifierExists = await prisma.links.findFirst({
			where: {
				identifier
			}
		});
		if (identifierExists) {
			res.conflict('Album with this identifier already exists');
			return;
		}
	} else {
		identifier = await getUniqueAlbumIdentifier();
		if (!identifier) {
			res.internalServerError('There was a problem allocating a link for your album');
			return;
		}
	}

	const insertObj = {
		identifier,
		userId: req.user.id,
		uuid: uuidv4(),
		albumId: exists.id,
		enabled: true,
		enableDownload: true,
		expiresAt: null,
		views: 0
	};

	await prisma.links.create({
		data: insertObj
	});

	return res.send({
		message: 'Successfully created link',
		data: {
			identifier,
			uuid: insertObj.uuid,
			albumId: exists.uuid,
			enabled: insertObj.enabled,
			enableDownload: insertObj.enableDownload,
			expiresAt: insertObj.expiresAt,
			views: insertObj.views
		}
	});
};
