import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const match = await prisma.match.findUnique({
            where: { id },
            include: {
                group: {
                    select: {
                        name: true
                    }
                },
                matchTeam: {
                    include: {
                        playerPerformances: true,
                    },
                },
                winTeam: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!match) {
            return NextResponse.json(
                { error: "Match not found" },
                { status: 404 }
            );
        }

        const performances = match.matchTeam.flatMap(
            (team) => team.playerPerformances
        );

        if (!performances.length) {
            return NextResponse.json(
                { error: "No performances found" },
                { status: 404 }
            );
        }

        const sorted = [...performances].sort(
            (a, b) => b.totalPoints - a.totalPoints
        );
        const teamMap = new Map(
            match.matchTeam.map(team => [
                team.id,
                {
                    name: team.name,
                    image: team.image,
                },
            ])
        );

        const top5 = sorted.slice(0, 5);
        return NextResponse.json({
            matchName: match.name,
            groupName: match.group.name,
            players: top5.map((p, index) => ({
                rank: index + 1,
                name: p.name,
                image: p.image,
                team: teamMap.get(p.matchTeamId!),
                placementPoints: p.placementPoints,
                finishesPoints: p.finishesPoints,
                totalPoints: p.totalPoints,
                teamContribution: p.teamContribution,
                status: p.status,
            })),
        });

    } catch (error) {
        console.error("TOP 5 MVP ERROR:", error);

        return NextResponse.json(
            { error: "Failed to fetch Top 5 MVPs" },
            { status: 500 }
        );
    }
}

