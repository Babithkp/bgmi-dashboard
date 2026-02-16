import { uploadToS3 } from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await context.params
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teamTournaments: {
          include: {
            team: true
          }
        }
      },
    })
    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      )
    }
    return NextResponse.json(tournament)
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const thumbnail = formData.get("thumbnail") as File | null;
    const groupsRaw = formData.get("groups") as string;

    const groups: { name: string; teamIds: string[] }[] =
      JSON.parse(groupsRaw);

    const incomingTeams = groups.flatMap(group =>
      group.teamIds.map(teamId => ({
        teamId,
        group: group.name,
      }))
    );

    let imageUrl;

    if (thumbnail) {
      const buffer = Buffer.from(await thumbnail.arrayBuffer());
      const ext = thumbnail.name.split(".").pop();
      const key = `dashboard/tournaments/${Date.now()}.${ext}`;

      imageUrl = await uploadToS3(buffer, key, thumbnail.type);
    }

    await prisma.tournament.update({
      where: { id },
      data: {
        name,
        ...(imageUrl && { image: imageUrl }),
      },
    });

    const existingRelations = await prisma.teamTournament.findMany({
      where: { tournamentId: id },
    });

    const existingTeamIds = existingRelations.map(r => r.teamId);
    const incomingTeamIds = incomingTeams.map(t => t.teamId);

    const teamsToAdd = incomingTeams.filter(
      t => !existingTeamIds.includes(t.teamId)
    );

    const teamsToRemove = existingTeamIds.filter(
      id => !incomingTeamIds.includes(id)
    );

    const teamsToUpdateGroup = incomingTeams.filter(t => {
      const existing = existingRelations.find(
        r => r.teamId === t.teamId
      );

      return existing && existing.group !== t.group;
    });

    if (teamsToAdd.length > 0) {
      await prisma.teamTournament.createMany({
        data: teamsToAdd.map(t => ({
          teamId: t.teamId,
          tournamentId: id,
          group: t.group,
        })),
      });
    }

    if (teamsToRemove.length > 0) {
      await prisma.teamTournament.deleteMany({
        where: {
          tournamentId: id,
          teamId: { in: teamsToRemove },
        },
      });
    }

    await prisma.$transaction(
      teamsToUpdateGroup.map(t =>
        prisma.teamTournament.update({
          where: {
            teamId_tournamentId: {
              teamId: t.teamId,
              tournamentId: id,
            },
          },
          data: { group: t.group },
        })
      )
    );

    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teamTournaments: {
          include: { team: true },
        },
      },
    });

    return NextResponse.json(updatedTournament);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}


