import prisma from '../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handle(req, res) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
        const { title, content } = req.body;
        console.log(session)
        const result = await prisma.post.create({
            data: {
                title: title,
                content: content,
                user: { connect: { id: session.user.id } },
            },
        });
        res.json(result);
    }
    else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}