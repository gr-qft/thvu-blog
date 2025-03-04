import { withSentry } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { GuestBookEntry } from "@/lib/types/guestbook";
import { getServerSession } from "@/lib/getServerSession";

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<GuestBookEntry[] | string | GuestBookEntry>
) => {
  if (req.method === "GET") {
    const entries = await prisma.guestbook.findMany({
      orderBy: {
        updated_at: "desc",
      },
      select: { id: true, body: true, updated_at: true, user: true },
    });

    return res.json(
      entries.map<GuestBookEntry>((entry) => ({
        id: entry.id.toString(),
        body: entry.body,
        updated_at: entry.updated_at.toString(),
        user: {
          id: entry.user!.id,
          name: entry.user!.name!,
          image: entry.user!.image!,
        },
      }))
    );
  }
  const session = await getServerSession(req, res);
  if (!session) {
    return res.status(401).send("Unauthenticated");
  }

  const { user, id } = session;
  if (!user) {
    return res.status(403).send("Unauthorized");
  }

  if (req.method === "POST") {
    const body = (req.body.body || "").slice(0, 500);
    const newEntry = await prisma.guestbook.create({
      data: {
        body,
        userId: id as string,
      },
    });
    const guestbookEntry: GuestBookEntry = {
      id: newEntry.id.toString(),
      body: newEntry.body,
      updated_at: newEntry.updated_at.toString(),
      user: {
        id: id as string,
        name: user.name!,
        image: user.image!,
      },
    };

    return res.status(200).json(guestbookEntry);
  }

  return res.send("Method not allowed.");
};

export default withSentry(handler);
