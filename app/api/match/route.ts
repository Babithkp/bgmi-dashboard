import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, tournamentId, groupId } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament required" }, { status: 400 });
    }
    
    if (!groupId) {
      return NextResponse.json({ error: "Group required" }, { status: 400 });
    }

    const groupTeams = await prisma.groupTeamTournament.findMany({
      where: {
        groupId,
        tournamentId,
      },
      include: {
        team: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!groupTeams.length) {
      return NextResponse.json(
        { error: "No teams assigned to this group" },
        { status: 400 }
      );
    }

    const match = await prisma.match.create({
      data: {
        name: title.trim(),
        tournamentId,
        groupId,
        status: "Live",
      },
    });

    await prisma.matchTeam.createMany({
      data: groupTeams.map(({ team }) => ({
        name: team.name,
        image: team.image,
        group: groupId, // snapshot label OK
        status: "Live",
        matchId: match.id,
      })),
    });

    const createdMatchTeams = await prisma.matchTeam.findMany({
      where: { matchId: match.id },
    });

    const performances = createdMatchTeams.flatMap((matchTeam) => {
      const originalTeam = groupTeams.find(
        (gt) => gt.team.name === matchTeam.name
      )?.team;

      return (originalTeam?.players ?? []).map((player) => ({
        name: player.name,
        image: player.image,
        matchTeamId: matchTeam.id,
        status: "Alive",
      }));
    });

    if (performances.length > 0) {
      await prisma.matchPlayerPerformance.createMany({
        data: performances,
      });
    }

    return NextResponse.json({ success: true, match });

  } catch (error) {
    console.error("Create Match Error:", error);

    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}

