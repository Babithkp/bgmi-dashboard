import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request,
    context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const matches = await prisma.match.findMany({
            where: {
                id: id,
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
                winTeam:{
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

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { performances, winningTeamId }: {
            performances: {
                id: string;
                status: "Alive" | "Dead";
                placementPoints: number;
                finishesPoints: number;
            }[];
            winningTeamId: string | null;
        } = await req.json();

        console.log(winningTeamId);
        

        await prisma.$transaction(
            performances.map(p =>
                prisma.matchPlayerPerformance.update({
                    where: { id: p.id },
                    data: {
                        status: p.status,
                        placementPoints: p.placementPoints,
                        finishesPoints: p.finishesPoints,
                        totalPoints:
                            p.placementPoints + p.finishesPoints,
                    },
                })
            )
        );        
        if (winningTeamId) {
            await prisma.match.update({
                where: { id },
                data: {
                    winTeamId: winningTeamId,
                    status: "Completed",
                },
            });
        }


        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to update scores" },
            { status: 500 }
        );
    }
}
