import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request,
    context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const matches = await prisma.match.findMany({
            where: {
                tournamentId: id,
            },
            include: {
                playerPerformances: {
                    include: {
                        player: {
                            include: {
                                team: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                winTeam: {
                    select: {
                        name: true,
                        id: true,
                    }
                }
            }
        });

        return NextResponse.json(matches);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}