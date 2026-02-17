import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request,
  context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const matches = await prisma.match.findUnique({
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
        winTeam: {
          include: {
            players: true
          }
        }
      }
    });

    return NextResponse.json({
      matchName: matches?.name,
      groupName: matches?.group,
      players: matches?.playerPerformances.map((p) => ({
        name: p.player.name,
        gameName: p.player.name,
        team: p.player.team?.name,
        image: p.player.image,
        placementPoints: p.placementPoints,
        finishesPoints: p.finishesPoints,
        totalPoints: p.totalPoints,
        teamContribution: p.teamContribution,
        status: p.status,
      })),
      winingTeam: {
        name: matches?.winTeam?.name,
        image: matches?.winTeam?.image,
        players: matches?.winTeam?.players.map((p) => ({
          name: p.name,
          gameName: p.name,
          image: p.image,
        })),
      },
    });
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

    const {
      performances,
      winningTeamId,
    }: {
      performances: {
        id: string;
        status: "Alive" | "Dead";
        placementPoints: number;
        finishesPoints: number;
      }[];
      winningTeamId: string | null;
    } = await req.json();

    if (!performances || performances.length === 0) {
      return NextResponse.json(
        { error: "No performances provided" },
        { status: 400 }
      );
    }

    const dbPerformances = await prisma.matchPlayerPerformance.findMany({
      where: {
        id: { in: performances.map((p) => p.id) },
      },
      select: {
        id: true,
        player: {
          select: {
            teamId: true,
          },
        },
      },
    });

    const performancesWithTeam = performances.map((p) => {
      const db = dbPerformances.find((d) => d.id === p.id);

      return {
        ...p,
        teamId: db?.player.teamId ?? null,
      };
    });

    const performancesByTeam = performancesWithTeam.reduce((acc, p) => {
      if (!p.teamId) return acc;

      if (!acc[p.teamId]) acc[p.teamId] = [];
      acc[p.teamId].push(p);

      return acc;
    }, {} as Record<string, typeof performancesWithTeam>);

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
              teamContribution: Math.round(contribution),
            },
          });
        });
      })
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