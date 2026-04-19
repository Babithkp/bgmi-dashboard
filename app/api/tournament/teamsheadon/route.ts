import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { tournamentId, team1Id, team2Id, matchId } =
            await req.json();

        if (!tournamentId || !team1Id || !team2Id) {
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
            },
        });

        const allTeamsMap = new Map<
            string,
            {
                id: string;
                totalPoints: number;
                rank?: number;
            }
        >();

        const t1 = {
            id: team1Id,
            name: "",
            shortName: "",
            image: "",
            groupImage: "",
            totalFinishes: 0,
            totalPlacementPoints: 0,
            totalPoints: 0,
            matchesPlayed: 0,
            wins: 0,
            players: new Map<string, { id: string; name: string; image: string }>(),
        };

        const t2 = {
            id: team2Id,
            name: "",
            shortName: "",
            image: "",
            groupImage: "",
            totalFinishes: 0,
            totalPlacementPoints: 0,
            totalPoints: 0,
            matchesPlayed: 0,
            wins: 0,
            players: new Map<string, { id: string; name: string; image: string }>(),
        };

        matches.forEach((match) => {

            match.matchTeam.forEach((team) => {
                const existing = allTeamsMap.get(team.teamId);

                if (existing) {
                    existing.totalPoints += team.totalPoints ?? 0;
                } else {
                    allTeamsMap.set(team.teamId, {
                        id: team.teamId,
                        totalPoints: team.totalPoints ?? 0,
                    });
                }

                if (
                    team.teamId !== team1Id &&
                    team.teamId !== team2Id
                )
                    return;

                const target =
                    team.teamId === team1Id ? t1 : t2;

                target.name = team.name;
                target.shortName = team.shortName || "";
                target.image = team.image;
                target.groupImage = team.groupImage;

                target.totalPlacementPoints +=
                    team.placementPoints ?? 0;

                target.totalPoints += team.totalPoints ?? 0;

                target.matchesPlayed += 1;

                const finishes = team.playerPerformances.reduce(
                    (sum, p) => sum + (p.finishesPoints ?? 0),
                    0
                );

                target.totalFinishes += finishes;

                if (match.winnerId === team.id) {
                    target.wins += 1;
                }

                // Collect only players of THIS team
                team.playerPerformances.forEach((p) => {
                    if (!target.players.has(p.playerId)) {
                        target.players.set(p.playerId, {
                            id: p.playerId,
                            name: p.name,
                            image: p.image,
                        });
                    }
                });
            });
        });

        const rankedAllTeams = Array.from(allTeamsMap.values())
            .sort((a, b) => b.totalPoints - a.totalPoints);

        rankedAllTeams.forEach((team, index) => {
            team.rank = index + 1;
        });
        const t1Rank =
            rankedAllTeams.find((t) => t.id === t1.id)?.rank ?? 0;

        const t2Rank =
            rankedAllTeams.find((t) => t.id === t2.id)?.rank ?? 0;



        await prisma.headOnTeams.deleteMany();
        const teams = [t1, t2];
        await prisma.headOnTeams.createMany({
            data: teams.map((team) => {
                const playersArray = Array.from(team.players.values());
                const rank =
                    team.id === t1.id ? t1Rank : t2Rank;

                return {
                    name: team.name,
                    shortName: team.shortName,
                    image: team.image,
                    groupImage: team.groupImage ?? "",

                    totalWins: team.wins,
                    matchesPlayed: team.matchesPlayed,
                    placementPoints: team.totalPlacementPoints,
                    playersFinishesPoints: team.totalFinishes,
                    totalPoints: team.totalPoints,
                    rank,
                    player1Name: playersArray[0]?.name ?? "",
                    player1Image: playersArray[0]?.image ?? "",

                    player2Name: playersArray[1]?.name ?? "",
                    player2Image: playersArray[1]?.image ?? "",

                    player3Name: playersArray[2]?.name ?? "",
                    player3Image: playersArray[2]?.image ?? "",

                    player4Name: playersArray[3]?.name ?? "",
                    player4Image: playersArray[3]?.image ?? "",
                };
            }),
        });


        return NextResponse.json({
            comparison: {
                team1: {
                    ...t1,
                    rank: t1Rank,
                    players: Array.from(t1.players.values()),
                },
                team2: {
                    ...t2,
                    rank: t2Rank,
                    players: Array.from(t2.players.values()),
                },
            },
        });

    } catch (error) {
        console.error("TEAM COMPARE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to compare teams" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const data = await prisma.headOnTeams.findMany();
        return NextResponse.json(data);
    } catch (error) {
        console.error("PLAYER COMPARE ERROR:", error);
        return NextResponse.json(
            { error: "Failed to compare players" },
            { status: 500 }
        );
    }
}