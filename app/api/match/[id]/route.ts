import { prisma } from "@/lib/prisma";
import { qstash } from "@/lib/qstash";
import { NextResponse } from "next/server";

type TeamStats = {
  teamName: string;
  totalFinishPoints: number;
  totalPoints: number;
  aliveCount: number;
  deadCount: number;
  teamImage: string;
  status: string | null;
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
        group: {
          select: { name: true },
        },
        tournament: {
          select: {
            allDead: true,
            oneAlive: true,
            twoAlive: true,
            threeAlive: true,
            fourAlive: true,
          },
        },
        matchTeam: {
          include: {
            playerPerformances: true,
          },
        },
        winTeam: {
          select: {
            name: true,
            image: true,
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

    const allPerformances =
      match.matchTeam.flatMap((team) => team.playerPerformances);

    if (!allPerformances.length) {
      return NextResponse.json(
        { error: "No performances found" },
        { status: 404 }
      );
    }

    // ✅ TEAM STATS (unchanged)
    const teamStats = match.matchTeam.reduce<Record<string, TeamStats>>(
      (acc, team) => {
        if (!acc[team.id]) {
          acc[team.id] = {
            teamName: team.name,
            teamImage: team.image,
            status: team.status,
            totalFinishPoints: 0,
            totalPoints: team.totalPoints,
            aliveCount: 0,
            deadCount: 0,
          };
        }

        team.playerPerformances.forEach((perf) => {
          acc[team.id].totalFinishPoints += perf.finishesPoints;

          if (perf.status === "Alive") {
            acc[team.id].aliveCount += 1;
          } else if (perf.status === "Dead") {
            acc[team.id].deadCount += 1;
          }
        });

        return acc;
      },
      {}
    );

    const rankedTeams = Object.values(teamStats)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((team, index) => ({
        teamRank: index + 1,
        teamName: team.teamName,
        teamImage: team.teamImage,
        teamTotalFinishPoints: team.totalFinishPoints,
        teamTotalPoints: team.totalPoints,
        aliveCount: team.aliveCount,
        deadCount: team.deadCount,
        status: team.status,
        aliveimage: resolveTeamStatusImage(
          team.aliveCount,
          match.tournament
        ),
      }));

    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name,
      status: match.status,
      teams: rankedTeams,
      
    });

  } catch (error) {
    console.error("TEAM RANK ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch match data" },
      { status: 500 }
    );
  }
}


interface Performance {
  id: string;
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
              status: p.status,
              finishesPoints: p.finishesPoints,
              teamContribution: Number(contribution.toFixed(2)),
            },
          });
        });
      })
    );

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
      select: { id: true },
    });

    await prisma.$transaction(
      teamsToEliminate.map((team) =>
        prisma.matchTeam.update({
          where: { id: team.id },
          data: { status: "Eliminated" },
        })
      )
    );

    teamsToEliminate.forEach(async (team) => {
      await qstash.publishJSON({
        url: "https://bgmi-dashboard-rust.vercel.app/api/match/elimination",
        body: { teamId: team.id },
        delay: 60,
      });
    });

    if (winningTeamId) {
      await prisma.match.update({
        where: { id },
        data: {
          winnerId: winningTeamId,
          status: "Completed",
        },
      });
    }

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