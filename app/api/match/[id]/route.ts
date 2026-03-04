import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type TeamStats = {
  teamName: string;
  totalFinishPoints: number;
  teamGroupImage: string;
  totalPoints: number;
  placementPoint: number;
  aliveCount: number;
  deadCount: number;
  totalWins: number;
  teamImage: string;
  status: string | null;
  matchesPlayed: number;
};

function resolveTeamStatusImage(
  aliveCount: number,
  tournament: {
    allDead?: string | null;
    oneAlive?: string | null;
    twoAlive?: string | null;
    threeAlive?: string | null;
    fourAlive?: string | null;
  } | null
) {
  if (!tournament) return null;

  if (aliveCount === 0) return tournament.allDead;
  if (aliveCount === 1) return tournament.oneAlive;
  if (aliveCount === 2) return tournament.twoAlive;
  if (aliveCount === 3) return tournament.threeAlive;

  return tournament.fourAlive;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        matchTeam: {
          select: { name: true },
        },
        tournament: {
          select: {
            id: true,
            allDead: true,
            oneAlive: true,
            twoAlive: true,
            threeAlive: true,
            fourAlive: true,
          },
        },
      },
    });

    if (!match || !match.tournament) {
      return NextResponse.json(
        { error: "Match or Tournament not found" },
        { status: 404 }
      );
    }

    const currentTeamSet = new Set(
      match.matchTeam.map((t) => t.name)
    );

    const tournamentMatches = await prisma.match.findMany({
      where: {
        tournamentId: match.tournament.id,
      },
      include: {
        matchTeam: {
          include: {
            playerPerformances: true,
          },
        },
        winTeam: {
          select: { name: true },
        },
      },
    });

    if (!tournamentMatches.length) {
      return NextResponse.json(
        { error: "No matches found in tournament" },
        { status: 404 }
      );
    }

    const winMap: Record<string, number> = {};

    for (const m of tournamentMatches) {
      const winnerName = m.winTeam?.name;
      if (!winnerName) continue;

      winMap[winnerName] = (winMap[winnerName] || 0) + 1;
    }

    const teamStats: Record<string, TeamStats> = {};

    for (const m of tournamentMatches) {
      for (const team of m.matchTeam) {
        if (!currentTeamSet.has(team.name)) continue;

        if (!teamStats[team.name]) {
          teamStats[team.name] = {
            teamName: team.name,
            teamImage: team.image,
            teamGroupImage: team.groupImage,
            totalFinishPoints: 0,
            totalPoints: 0,
            aliveCount: 0,
            deadCount: 0,
            placementPoint: 0,
            totalWins: winMap[team.name] || 0,
            status: team.status ?? null,
            matchesPlayed: 0,
          };
        }

        teamStats[team.name].matchesPlayed += 1;
        teamStats[team.name].totalPoints += team.totalPoints;
        teamStats[team.name].placementPoint += team.placementPoints;

        for (const perf of team.playerPerformances) {
          teamStats[team.name].totalFinishPoints += perf.finishesPoints;

          if (perf.status === "Alive")
            teamStats[team.name].aliveCount++;

          if (perf.status === "Dead")
            teamStats[team.name].deadCount++;
        }
      }
    }

    const rankedTeams = Object.values(teamStats)
      .sort((a, b) =>
        match.sortOrder === "Total Points"
          ? b.totalPoints - a.totalPoints
          : b.aliveCount - a.aliveCount
      )
      .map((team, index) => ({
        teamRank: index + 1,
        teamName: team.teamName,
        teamImage: team.teamImage,
        teamGroupImage: team.teamGroupImage,
        totalWins: team.totalWins,
        totalFinishPoints: team.totalFinishPoints,
        placementPoint: team.placementPoint,
        totalPoints: team.totalPoints,
        matchesPlayed: team.matchesPlayed,
        aliveCount: team.aliveCount,
        deadCount: team.deadCount,
        aliveimage: resolveTeamStatusImage(
          team.aliveCount,
          match.tournament
        ),
      }));

    return NextResponse.json({
      teams: rankedTeams,
    });

  } catch (error) {
    console.error("TOURNAMENT RANK ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch tournament leaderboard" },
      { status: 500 }
    );
  }
}

interface Performance {
  id: string;
  name: string;
  status: "Alive" | "Dead";
  matchTeamId: string | null;
  finishesPoints: number;
}
type TeamPlacement = {
  teamId: string;
  placementPoints: number;
};


export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { performances, winningTeamId, teamPlacements } =
      await req.json() as {
        performances: Performance[];
        winningTeamId?: string;
        teamPlacements: TeamPlacement[];
      };

    if (!performances?.length) {
      return NextResponse.json(
        { error: "No performances provided" },
        { status: 400 }
      );
    }

    const validPerformances = await prisma.matchPlayerPerformance.count({
      where: {
        id: { in: performances.map((p: Performance) => p.id) },
        matchTeam: {
          matchId: id,
        },
      },
    });

    if (validPerformances !== performances.length) {
      return NextResponse.json(
        { error: "Invalid performance data" },
        { status: 400 }
      );
    }

    if (winningTeamId) {
      const validWinner = await prisma.matchTeam.findFirst({
        where: {
          id: winningTeamId,
          matchId: id,
        },
      });

      if (!validWinner) {
        return NextResponse.json(
          { error: "Invalid winner selected" },
          { status: 400 }
        );
      }

      await prisma.match.update({
        where: { id },
        data: {
          winnerId: winningTeamId,
          status: "Completed",
        },
      });
    }

    const dbPerformances = await prisma.matchPlayerPerformance.findMany({
      where: {
        id: { in: performances.map((p: Performance) => p.id) },
      },
      select: {
        id: true,
        matchTeamId: true,
      },
    });

    const performancesWithTeam: Performance[] = performances.map((p: Performance) => {
      const db = dbPerformances.find((d) => d.id === p.id);

      return {
        ...p,
        matchTeamId: db?.matchTeamId ?? null,
      };
    });

    const performancesByTeam = performancesWithTeam.reduce<
      Record<string, Performance[]>
    >((acc, p) => {
      if (!p.matchTeamId) return acc;

      if (!acc[p.matchTeamId]) acc[p.matchTeamId] = [];
      acc[p.matchTeamId].push(p);

      return acc;
    }, {});

    await prisma.$transaction(
      Object.entries(performancesByTeam).map(([teamId, teamPlayers]) => {

        const rawPlacement =
          teamPlacements.find(t => t.teamId === teamId)?.placementPoints;

        const safePlacement = isNaN(Number(rawPlacement))
          ? 0
          : Number(rawPlacement);

        const totalFinishes = teamPlayers.reduce(
          (sum, p) => sum + Number(p.finishesPoints ?? 0),
          0
        );
        const totalPoints = safePlacement + totalFinishes;
        return prisma.matchTeam.update({
          where: { id: teamId },
          data: {
            placementPoints: Math.max(safePlacement, 0),
            totalPoints: Math.max(totalPoints, 0),
          },
        });
      })
    );
    await prisma.$transaction(
      Object.entries(performancesByTeam).flatMap(([, teamPlayers]) => {
        const totalFinishes = teamPlayers.reduce(
          (sum, p) => sum + p.finishesPoints,
          0
        );
        return teamPlayers.map((p) => {
          const contribution =
            totalFinishes > 0
              ? (p.finishesPoints / totalFinishes) * 100
              : 0;
          return prisma.matchPlayerPerformance.update({
            where: { id: p.id },
            data: {
              name: p.name,
              status: p.status,
              finishesPoints: p.finishesPoints,
              teamContribution: Number(contribution.toFixed(2)),
            },
          });
        });
      })
    );
    const totalTeamsInMatch = await prisma.matchTeam.count({
      where: { matchId: id },
    });

    const alreadyEliminatedCount = await prisma.matchTeam.count({
      where: {
        matchId: id,
        status: "Eliminated",
      },
    });

    // Step 1: Get affected team IDs
    const affectedTeamIds = Object.keys(performancesByTeam);

    const teamsToEliminate = await prisma.matchTeam.findMany({
      where: {
        id: { in: affectedTeamIds },
        status: {
          notIn: ["Eliminated", "Displayed"],
        },
        playerPerformances: {
          none: {
            status: "Alive",
          },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        playerPerformances: {
          select: {
            finishesPoints: true,
          },
        },
      },
    });

    await prisma.$transaction(
      teamsToEliminate.map((team) =>
        prisma.matchTeam.update({
          where: { id: team.id },
          data: { status: "Eliminated" },
        })
      )
    );
    if (teamsToEliminate.length > 0) {
      await prisma.eliminationTeam.deleteMany()
    }

    for (let i = 0; i < teamsToEliminate.length; i++) {
      const team = teamsToEliminate[i];
      const eliminationRank =
        totalTeamsInMatch - alreadyEliminatedCount - i;
      const totalFinishPoints = team.playerPerformances.reduce(
        (sum, p) => sum + p.finishesPoints,
        0
      );
      await prisma.eliminationTeam.create({
        data: {
          id: team.id,
          name: team.name,
          rank: eliminationRank,
          totalFinishPoints: totalFinishPoints,
          image: team.image,
          status: "Eliminated",
        },
      });
    }
    // Get alive player count per team
    const teams = await prisma.matchTeam.findMany({
      where: { matchId: id },
      include: {
        playerPerformances: {
          select: { status: true }
        }
      }
    });

    let totalAlivePlayers = 0;

    const aliveCounts: Record<string, number> = {};

    for (const team of teams) {
      const alive = team.playerPerformances.filter(
        p => p.status === "Alive"
      ).length;

      aliveCounts[team.id] = alive;
      totalAlivePlayers += alive;
    }

    // calculate winrate
    await prisma.$transaction(
      teams.map(team => {
        const alive = aliveCounts[team.id] || 0;

        const winrate =
          totalAlivePlayers > 0
            ? (alive / totalAlivePlayers) * 100
            : 0;

        return prisma.matchTeam.update({
          where: { id: team.id },
          data: {
            winrate: Number(winrate.toFixed(2))
          }
        });
      })
    );


    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("PATCH MATCH ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update scores" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const match = await prisma.match.findUnique({
      where: { id },
    });
    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }
    await prisma.match.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete match" },
      { status: 500 }
    );
  }
}