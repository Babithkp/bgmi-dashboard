import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { PlayerTypes } from "@/lib/types";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const teams = await prisma.team.findMany({
            include: {
                players: {
                    select: {
                        name: true,
                        image: true,
                    }
                }
            }
        });
        return NextResponse.json(teams);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
    }
}

async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3
): Promise<T> {
    try {
        return await fn();
    } catch (error: unknown) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === "P2010" ||
                error.message.includes("TransientTransactionError"))
        ) {
            if (retries > 0) {
                console.warn(`Retrying DB transaction... (${retries})`);
                await new Promise(res => setTimeout(res, 300));
                return withRetry(fn, retries - 1);
            }
        }

        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const name = formData.get("name") as string;
        const teamId = formData.get("teamId") as string | null;

        const logo = formData.get("logo");
        const editLogo = formData.get("editLogo") as string | null;

        const playersRaw = formData.get("players") as string | null;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Team name is required" },
                { status: 400 }
            );
        }

        let imageUrl = editLogo || "";

        if (logo instanceof File && logo.size > 0) {
            const buffer = Buffer.from(await logo.arrayBuffer());
            const ext = logo.name.split(".").pop() || "jpg";
            const key = `dashboard/teams/${name.trim()}-${Date.now()}.${ext}`;

            imageUrl = await uploadToS3(buffer, key, logo.type);
        }

        let players: PlayerTypes[] = [];

        if (playersRaw) {
            try {
                players = JSON.parse(playersRaw);
            } catch {
                return NextResponse.json(
                    { error: "Invalid players JSON" },
                    { status: 400 }
                );
            }
        }

        const team = await withRetry(() =>
            prisma.$transaction(async () => {
                let savedTeam;

                if (!teamId) {
                    savedTeam = await prisma.team.create({
                        data: { name, image: imageUrl },
                    });
                } else {
                    savedTeam = await prisma.team.update({
                        where: { id: teamId },
                        data: { name, image: imageUrl },
                    });

                    await prisma.player.deleteMany({
                        where: { teamId: savedTeam.id },
                    });
                }

                if (players.length > 0) {
                    await prisma.player.createMany({
                        data: players.map(p => ({
                            name: p.name,
                            gameName: p.gameName,
                            image: p.image,
                            order: p.order,
                            teamId: savedTeam.id,
                        })),
                    });
                }
            }))


            return NextResponse.json(JSON.parse(JSON.stringify(team)));
    } catch (error) {
        console.error("TEAM SAVE ERROR:", error);

        return NextResponse.json(
            { error: "Failed to save team" },
            { status: 500 }
        );
    }
}