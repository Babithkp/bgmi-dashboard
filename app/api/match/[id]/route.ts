import { prisma } from "@/lib/prisma";
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
            name: true,
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
            totalPoints: 0,
            aliveCount: 0,
            deadCount: 0,
          };
        }

        team.playerPerformances.forEach((perf) => {
          acc[team.id].totalFinishPoints += perf.finishesPoints;
          acc[team.id].totalPoints += perf.totalPoints;

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
      }));

    // ✅ ELIMINATIONS (NEW)
    const eliminations = rankedTeams
      .filter((team) =>
        match.matchTeam.find(
          (mt) => mt.name === team.teamName && mt.status === "Eliminated"
        )
      )
      .map((team) => ({
        rank: team.teamRank,
        teamName: team.teamName,
        teamImage: team.teamImage,
        totalFinishPoints: team.teamTotalFinishPoints,
        totalPoints: team.teamTotalPoints,
      }));

    return NextResponse.json({
      matchName: match.name,
      groupName: match.group?.name,
      status: match.status,

      winner: match.winTeam
        ? {
            name: match.winTeam.name,
            image: match.winTeam.image,
          }
        : null,

      teams: rankedTeams,

      // 👇 NEW FIELD
      eliminations: eliminations.length ? eliminations : null,
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
  placementPoints: number;
  finishesPoints: number;
  matchTeamId: string | null;
}


export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { performances, winningTeamId } = await req.json();

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
      Object.values(performancesByTeam).flatMap((teamPlayers) => {
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
              placementPoints: p.placementPoints,
              finishesPoints: p.finishesPoints,
              totalPoints: p.placementPoints + p.finishesPoints,
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