import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


type AggregatedPlayer = {
  name: string;
  image: string;
  totalPoints: number;
  finishesPoints: number;
  teamContribution: number;
};

type AggregatedTeam = {
  name: string;
  image: string;
  totalPoints: number;
  placementPoints: number;
  finishesPoints: number;
  totalWins: number;
  matchesPlayed: number;
  players: Record<string, AggregatedPlayer>;
};

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        matches: {
          include: {
            winTeam: {
              select: { name: true },
            },
            matchTeam: {
              include: {
                playerPerformances: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (!tournament.matches.length) {
      return NextResponse.json(
        { error: "No matches found" },
        { status: 404 }
      );
    }

    const winMap: Record<string, number> = {};

    tournament.matches.forEach(match => {
      const winnerName = match.winTeam?.name;
      if (!winnerName) return;

      winMap[winnerName] = (winMap[winnerName] || 0) + 1;
    });

    const matchCountMap: Record<string, number> = {};

    tournament.matches.forEach(match => {
      match.matchTeam?.forEach(team => {
        matchCountMap[team.name] =
          (matchCountMap[team.name] || 0) + 1;
      });
    });

    // ✅ 2️⃣ Flatten all teams
    const allTeams =
      tournament.matches.flatMap(match => match.matchTeam ?? []);

    if (!allTeams.length) {
      return NextResponse.json(
        { error: "No teams found" },
        { status: 404 }
      );
    }

    // ✅ 3️⃣ Aggregate totals
    const teamTotals = allTeams.reduce<Record<string, AggregatedTeam>>(
      (acc, team) => {
        const teamKey = `${team.name}-${team.image}`;

        if (!acc[teamKey]) {
          acc[teamKey] = {
            name: team.name,
            image: team.image,
            totalPoints: 0,
            placementPoints: 0,
            finishesPoints: 0,
            totalWins: winMap[team.name] || 0,
            matchesPlayed: matchCountMap[team.name] || 0,
            players: {},
          };
        }

        const finishedPoints = team.playerPerformances.reduce(
          (sum, p) => sum + (p.finishesPoints ?? 0),
          0
        );

        const placement = team.placementPoints ?? 0;
        const teamTotal = placement + finishedPoints;

        acc[teamKey].placementPoints += placement;
        acc[teamKey].finishesPoints += finishedPoints;
        acc[teamKey].totalPoints += teamTotal;

        team.playerPerformances.forEach(perf => {
          const playerKey = `${perf.name}-${perf.image}`;

          if (!acc[teamKey].players[playerKey]) {
            acc[teamKey].players[playerKey] = {
              name: perf.name,
              image: perf.image,
              totalPoints: 0,
              finishesPoints: 0,
              teamContribution: 0,
            };
          }

          const playerTotal = placement + perf.finishesPoints;

          acc[teamKey].players[playerKey].totalPoints += playerTotal;
          acc[teamKey].players[playerKey].finishesPoints +=
            perf.finishesPoints;
          acc[teamKey].players[playerKey].teamContribution +=
            perf.teamContribution;
        });

        return acc;
      },
      {}
    );

    // ✅ 4️⃣ Sort by Wins first, then Points
    const top5Teams = Object.values(teamTotals)
      .sort((a, b) => {
        if (b.totalWins !== a.totalWins) {
          return b.totalWins - a.totalWins;
        }
        return b.totalPoints - a.totalPoints;
      })
      .slice(0, 5);

    return NextResponse.json({
      tournamentName: tournament.name,

      teams: top5Teams.map((teamData, index) => ({
        rank: index + 1,
        name: teamData.name,
        image: teamData.image,
        teamGroupImage: teamData.image,
        totalWins: teamData.totalWins,
        matchesPlayed: teamData.matchesPlayed,
        totalPoints: teamData.totalPoints,
        placementPoints: teamData.placementPoints,
        finishesPoints: teamData.finishesPoints,

        players: Object.values(teamData.players)
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .map(player => ({
            name: player.name,
            image: player.image,
            totalPoints: player.totalPoints,
            finishesPoints: player.finishesPoints,
            teamContribution: Number(
              player.teamContribution.toFixed(2)
            ),
          })),
      })),
    });

  } catch (error) {
    console.error("TOP 5 TEAMS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch Top 5 Teams" },
      { status: 500 }
    );
  }
}