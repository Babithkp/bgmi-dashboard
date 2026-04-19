import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { tournamentId, player1Id, player2Id, matchId } =
            await req.json();

        if (!tournamentId || !player1Id || !player2Id) {
            return NextResponse.json(
                { error: "Missing parameters" },
                { status: 400 }
            );
        }


        const matches = await prisma.match.findMany({
            where: matchId
                ? { id: matchId }
                : { tournamentId },
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
            teamImage: "",
            teamName: "",
            totalFinishes: 0,
            totalPlacementPoints: 0,
            matchesPlayed: 0,
            wins: 0,
            teamTotalFinishes: 0,
            noOfPlayerDeaths: 0,
        };

        const p2 = { ...p1, id: player2Id };

        const playerMap = new Map();
        matches.forEach(match => {
            match.matchTeam.forEach(team => {
                team.playerPerformances.forEach(player => {
                    const id = player.id;

                    if (playerMap.has(id)) {
                        playerMap.get(id).finishesPoints += player.finishesPoints ?? 0;
                    } else {
                        playerMap.set(id, {
                            id:id,
                            name: player.name,
                            finishesPoints: player.finishesPoints ?? 0
                        });
                    }
                });
            });
        });

        // Convert to array + sort
        const sortedPlayers = [...playerMap.values()].sort(
            (a, b) => b.finishesPoints - a.finishesPoints
        );

        // Add ranks
        const rankedPlayers = sortedPlayers.map((player, index) => ({
            rank: index + 1,
            ...player
        }));

        matches.forEach((match) => {
            match.matchTeam.forEach((team) => {
                const teamTotalFinishes = team.playerPerformances.reduce(
                    (sum, p) => sum + (p.finishesPoints ?? 0),
                    0
                );

                team.playerPerformances.forEach((perf) => {

                    const isP1 = perf.playerId === player1Id;
                    const isP2 = perf.playerId === player2Id;
                    
                    if (!isP1 && !isP2) return;
                    
                    const target = isP1 ? p1 : p2;
                    target.name = perf.name;
                    target.image = perf.image;
                    target.teamName = team.name;
                    target.teamImage = team.image;
                    target.noOfPlayerDeaths += perf.status === "Dead" ? 1 : 0;
                    target.totalFinishes += perf.finishesPoints ?? 0;
                    target.totalPlacementPoints += team.placementPoints ?? 0;
                    target.teamTotalFinishes += teamTotalFinishes;
                    target.matchesPlayed += 1;

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

        const p1Contribution =
            p1.teamTotalFinishes > 0
                ? Number(((p1.totalFinishes / p1.teamTotalFinishes) * 100).toFixed(2))
                : 0;

        const p2Contribution =
            p2.teamTotalFinishes > 0
                ? Number(((p2.totalFinishes / p2.teamTotalFinishes) * 100).toFixed(2))
                : 0;


        await prisma.headOnPlayers.deleteMany();

        await prisma.headOnPlayers.createMany({
            data: [
                {
                    name: p1.name,
                    image: p1.image,
                    gameName: p1.gameName ?? null,
                    teamImage: p1.teamImage,
                    totalPoints: p1Total,
                    placementPoints: p1.totalPlacementPoints,
                    finishesPoints: p1.totalFinishes,
                    teamContribution: p1Contribution,
                    matchesPlayed: p1.matchesPlayed,
                    totalWins: p1.wins,
                    rank: rankedPlayers.find((t) => t.name === p1.name)?.rank,
                    fdRatio: p1.totalFinishes / (p1.noOfPlayerDeaths === 0 ? 1 : p1.noOfPlayerDeaths),
                },
                {
                    name: p2.name,
                    image: p2.image,
                    gameName: p2.gameName ?? null,
                    teamImage: p2.teamImage,
                    totalPoints: p2Total,
                    placementPoints: p2.totalPlacementPoints,
                    finishesPoints: p2.totalFinishes,
                    teamContribution: p2Contribution,
                    matchesPlayed: p2.matchesPlayed,
                    totalWins: p2.wins,
                    rank: rankedPlayers.find((t) => t.name === p2.name)?.rank,
                    fdRatio: p2.totalFinishes / (p2.noOfPlayerDeaths === 0 ? 1 : p2.noOfPlayerDeaths),
                },
            ],
        });

        return NextResponse.json({
            comparison: {
                player1: {
                    ...p1,
                    totalPoints: p1Total,
                    playerContribution: p1Contribution,
                    fdRatio: p1.totalFinishes / (p1.noOfPlayerDeaths === 0 ? 1 : p1.noOfPlayerDeaths),
                    deathCount: p1.noOfPlayerDeaths,
                    rank:rankedPlayers.find((t) => t.name === p1.name)?.rank,
                    avgContribution:
                        p1.matchesPlayed > 0
                            ? Number((p1Contribution / p1.matchesPlayed).toFixed(2))
                            : 0,
                },
                player2: {
                    ...p2,
                    totalPoints: p2Total,
                    playerContribution: p1Contribution,
                    rank:rankedPlayers.find((t) => t.name === p2.name)?.rank, 
                    fdRatio: p2.totalFinishes / (p2.noOfPlayerDeaths === 0 ? 1 : p2.noOfPlayerDeaths),
                    deathCount: p2.noOfPlayerDeaths,
                    avgContribution:
                        p2.matchesPlayed > 0
                            ? Number((p2Contribution / p2.matchesPlayed).toFixed(2))
                            : 0
                },
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

export async function GET() {
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