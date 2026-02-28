import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { tournamentId, player1Id, player2Id } =
            await req.json();

        if (!tournamentId || !player1Id || !player2Id) {
            return NextResponse.json(
                { error: "Missing parameters" },
                { status: 400 }
            );
        }

        const matches = await prisma.match.findMany({
            where: { tournamentId },
            include: {
                matchTeam: {
                    include: {
                        playerPerformances: true,
                    },
                },
                winTeam: true,
            },
        });

        const p1 = {
            id: player1Id,
            name: "",
            gameName: "",
            image: "",
            teamName: "",
            totalFinishes: 0,
            totalPlacementPoints: 0,
            matchesPlayed: 0,
            wins: 0,
            totalContribution: 0,
        };

        const p2 = { ...p1, id: player2Id };

        matches.forEach((match) => {
            match.matchTeam.forEach((team) => {
                team.playerPerformances.forEach((perf) => {

                    const isP1 = perf.playerId === player1Id;
                    const isP2 = perf.playerId === player2Id;

                    if (!isP1 && !isP2) return;

                    const target = isP1 ? p1 : p2;

                    target.name = perf.name;
                    target.image = perf.image;
                    target.teamName = team.name;

                    target.totalFinishes += perf.finishesPoints ?? 0;
                    target.totalPlacementPoints += team.placementPoints ?? 0;
                    target.matchesPlayed += 1;
                    target.totalContribution += perf.teamContribution ?? 0;

                    if (match.winnerId === team.id) {
                        target.wins += 1;
                    }
                });
            });
        });

        const p1Total =
            p1.totalFinishes + p1.totalPlacementPoints;
        const p2Total =
            p2.totalFinishes + p2.totalPlacementPoints;

        const winner =
            p1Total > p2Total
                ? p1.name
                : p2Total > p1Total
                    ? p2.name
                    : "Draw";

        await prisma.headOnPlayers.deleteMany();

        await prisma.headOnPlayers.createMany({
            data: [
                {
                    name: p1.name,
                    image: p1.image,
                    gameName: p1.gameName ?? null,
                    totalPoints: p1Total,
                    placementPoints: p1.totalPlacementPoints,
                    finishesPoints: p1.totalFinishes,
                    teamContribution: p1.totalContribution,
                    matchesPlayed: p1.matchesPlayed,
                    totalWins: p1.wins,
                },
                {
                    name: p2.name,
                    image: p2.image,
                    gameName: p2.gameName ?? null,
                    totalPoints: p2Total,
                    placementPoints: p2.totalPlacementPoints,
                    finishesPoints: p2.totalFinishes,
                    teamContribution: p2.totalContribution,
                    matchesPlayed: p2.matchesPlayed,
                    totalWins: p2.wins,
                },
            ],
        });

        return NextResponse.json({
            comparison: {
                player1: {
                    ...p1,
                    totalPoints: p1Total,
                    avgContribution:
                        p1.matchesPlayed > 0
                            ? Number(
                                (p1.totalContribution /
                                    p1.matchesPlayed).toFixed(2)
                            )
                            : 0,
                },
                player2: {
                    ...p2,
                    totalPoints: p2Total,
                    avgContribution:
                        p2.matchesPlayed > 0
                            ? Number(
                                (p2.totalContribution /
                                    p2.matchesPlayed).toFixed(2)
                            )
                            : 0,
                },
                winner,
            },
        });

    } catch (error) {
        console.error("PLAYER COMPARE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to compare players" },
            { status: 500 }
        );
    }
}

export async function GET(){
    try {
        const data = await prisma.headOnPlayers.findMany();
        return NextResponse.json(data);
    } catch (error) {
        console.error("PLAYER COMPARE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to compare players" },
            { status: 500 }
        );
    }
}